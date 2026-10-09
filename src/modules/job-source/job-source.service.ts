import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import { ApiError } from "../../utils/index.ts";
import { logger } from "../../config/index.ts";
import type { IUser } from "../user/user.model.ts";
import TelegramAccountModel from "../telegram/telegram.model.ts";
import { TELEGRAM_ACCOUNT_STATUS } from "../telegram/telegram.constants.ts";
import type TelegramClientService from "../telegram/telegram-client.service.ts";
import { JobSourceModel } from "./job-source.model.ts";
import { JOB_SOURCE_PROVIDER, JOB_SOURCE_STATUS, JOB_SOURCE_TYPE } from "./job-source.constants.ts";
import type {
    TAddJobSourceResult,
    TAddedJobSource,
    TCreateJobSourceDTO,
    TGetJobSourcesQuery,
    TGetJobSourcesResult,
    TJobSourceType,
    TSkippedJobSource,
} from "./job-source.types.ts";

type TSourceItem = TCreateJobSourceDTO["sources"][number];

type TResolvedSource = TSourceItem & {
    sourceName: string;
    sourceUsername: string | null;
};

type TDialogSummary = {
    isUser: boolean;
    isGroup: boolean;
    isChannel: boolean;
    name: string | null;
    username: string | null;
};

const classifySourceType = (dialog: TDialogSummary): TJobSourceType | null => {
    if (dialog.isUser) return null;
    // A megagroup is flagged as both channel and group; only a broadcast channel is channel-only.
    if (dialog.isChannel && !dialog.isGroup) return JOB_SOURCE_TYPE.TELEGRAM_CHANNEL;
    if (dialog.isGroup) return JOB_SOURCE_TYPE.TELEGRAM_GROUP;
    return null;
};

const isDuplicateKeyError = (error: unknown): boolean => {
    const code = (error as { code?: number } | null)?.code;
    const writeErrors = (error as { writeErrors?: Array<{ code?: number }> } | null)?.writeErrors;
    return code === 11000 || Boolean(writeErrors?.some((entry) => entry.code === 11000));
};

/** User input is interpolated into a $regex, so metacharacters must be neutralised. */
const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Keeps list rows identical to the shape returned by addJobSource (lean docs expose `_id`, not the `id` virtual). */
const toListItem = (document: { _id: unknown } & Omit<TAddedJobSource, "id">): TAddedJobSource => ({
    id: document._id,
    provider: document.provider,
    type: document.type,
    externalSourceId: document.externalSourceId,
    sourceName: document.sourceName,
    sourceUsername: document.sourceUsername,
    status: document.status,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
});

class JobSourceService {
    private readonly telegramClientService: TelegramClientService;

    constructor(telegramClientService: TelegramClientService) {
        this.telegramClientService = telegramClientService;
    }

    addJobSource = async (loggedInUser: IUser, sources: TCreateJobSourceDTO["sources"]): Promise<TAddJobSourceResult> => {
        // Validate supported provider (Telegram) before doing any DB lookups or Telegram API calls.
        this.assertSupportedProviders(sources);

        const account = await TelegramAccountModel.findOne({ userId: loggedInUser._id }).lean();

        if (!account) {
            throw new ApiError(StatusCodes.NOT_FOUND, "Telegram account not connected");
        }

        if (account.status !== TELEGRAM_ACCOUNT_STATUS.CONNECTED) {
            throw new ApiError(StatusCodes.BAD_REQUEST, `Telegram account is not connected (status: ${account.status})`);
        }

        if (!account.userSessionString) {
            throw new ApiError(StatusCodes.CONFLICT, "Telegram session is missing, please reconnect Telegram and try again");
        }

        const skipped: TSkippedJobSource[] = [];
        const uniqueSources = this.dedupeWithinPayload(sources, skipped);

        const alreadyStored = await this.findAlreadyStored(loggedInUser, uniqueSources);
        const toCreate: TSourceItem[] = [];

        for (const source of uniqueSources) {
            if (alreadyStored.has(source.externalSourceId)) {
                skipped.push({ externalSourceId: source.externalSourceId, reason: "ALREADY_EXISTS" });
            } else {
                toCreate.push(source);
            }
        }

        // Nothing new to add: skip the Telegram round trip entirely.
        if (toCreate.length === 0) {
            return { created: [], skipped };
        }

        const resolvedSources = await this.resolveFromTelegram(loggedInUser, toCreate);
        const created = await this.insertSources(loggedInUser, account._id, resolvedSources, skipped);

        logger.info({ userId: String(loggedInUser._id), created: created.length, skipped: skipped.length }, "Job sources processed");

        return { created, skipped };
    };

    getJobSources = async (loggedInUser: IUser, query: TGetJobSourcesQuery): Promise<TGetJobSourcesResult> => {
        const { status, type, search, sortBy, sortOrder } = query;

        const filter: Record<string, unknown> = { userId: loggedInUser._id, deletedAt: null };

        if (status) filter.status = status;
        if (type) filter.type = type;
        if (search) filter.sourceName = { $regex: escapeRegex(search), $options: "i" };

        const sortField = sortBy === "sourceName" ? "sourceName" : "createdAt";
        const sortDirection = sortOrder === "asc" ? 1 : -1;

        const documents = await JobSourceModel.find(filter).sort({ [sortField]: sortDirection }).lean();

        return { sources: documents.map(toListItem) };
    };

    private assertSupportedProviders = (sources: TSourceItem[]): void => {
        const unsupported = [...new Set(sources.filter((source) => source.provider !== JOB_SOURCE_PROVIDER.TELEGRAM).map((source) => source.provider))];

        if (unsupported.length === 0) return;

        throw new ApiError(
            StatusCodes.BAD_REQUEST,
            `Only the "${JOB_SOURCE_PROVIDER.TELEGRAM}" provider is supported right now. Unsupported provider(s): ${unsupported.join(", ")}`,
            unsupported.map((provider) => ({ field: "provider", message: `Provider "${provider}" is not supported yet` })),
        );
    };

    private dedupeWithinPayload = (sources: TSourceItem[], skipped: TSkippedJobSource[]): TSourceItem[] => {
        const seen = new Set<string>();
        const unique: TSourceItem[] = [];

        for (const source of sources) {
            if (seen.has(source.externalSourceId)) {
                skipped.push({ externalSourceId: source.externalSourceId, reason: "DUPLICATE_IN_REQUEST" });
                continue;
            }
            seen.add(source.externalSourceId);
            unique.push(source);
        }

        return unique;
    };

    private findAlreadyStored = async (loggedInUser: IUser, sources: TSourceItem[]): Promise<Set<string>> => {
        if (sources.length === 0) return new Set();

        const stored = await JobSourceModel
            .find({
                userId: loggedInUser._id,
                provider: JOB_SOURCE_PROVIDER.TELEGRAM,
                externalSourceId: { $in: sources.map((source) => source.externalSourceId) },
                deletedAt: null,
            })
            .select("externalSourceId")
            .lean();

        return new Set(stored.map((document) => document.externalSourceId));
    };

    /**
     * Pulls the dialogs once so every requested source can be validated and named in a single
     * round trip, instead of issuing one entity lookup per source.
     */
    private resolveFromTelegram = async (loggedInUser: IUser, sources: TSourceItem[]): Promise<TResolvedSource[]> => {
        const sessionString = await this.telegramClientService.getSessionString(loggedInUser._id.toString());
        const client = this.telegramClientService.createClientUsingSessionString(sessionString);
        let dialogSummaryById: Map<string, TDialogSummary>;

        try {
            await client.connect();
            const dialogs = await client.getDialogs({});

            dialogSummaryById = new Map();

            for (const dialog of dialogs) {
                if (!dialog.id) continue;

                const entity = dialog.entity as { username?: unknown } | undefined;
                const username = typeof entity?.username === "string" && entity.username.length > 0 ? entity.username : null;
                const name = dialog.name ?? dialog.title ?? null;

                dialogSummaryById.set(dialog.id.toString(), {
                    isUser: dialog.isUser,
                    isGroup: dialog.isGroup,
                    isChannel: dialog.isChannel,
                    name: name && name.trim().length > 0 ? name : null,
                    username,
                });
            }
        } catch (error) {
            if (error instanceof ApiError) throw error;

            logger.error({ error, userId: String(loggedInUser._id) }, "Failed to fetch Telegram dialogs for job sources");
            throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, `Unable to fetch your Telegram chats: ${(error as Error).message}`);
        } finally {
            await client.disconnect().catch((error: unknown) => {
                logger.warn({ error }, "Failed to disconnect the Telegram client after reading job sources");
            });
        }

        return this.validateAndNameSources(sources, dialogSummaryById);
    };

    private validateAndNameSources = (sources: TSourceItem[], dialogById: Map<string, TDialogSummary>): TResolvedSource[] => {
        const errors: Array<{ externalSourceId: string; message: string }> = [];
        const resolved: TResolvedSource[] = [];

        for (const source of sources) {
            const dialog = dialogById.get(source.externalSourceId);

            if (!dialog) {
                errors.push({
                    externalSourceId: source.externalSourceId,
                    message: "Not found among your Telegram groups or channels. List them first with GET /api/v1/telegram/sources/available.",
                });
                continue;
            }

            const actualType = classifySourceType(dialog);

            if (!actualType) {
                errors.push({ externalSourceId: source.externalSourceId, message: "externalSourceId must point to a group or a channel, not a private chat" });
                continue;
            }

            if (actualType !== source.type) {
                errors.push({ externalSourceId: source.externalSourceId, message: `Declared type "${source.type}" but this is a "${actualType}"` });
                continue;
            }

            resolved.push({
                ...source,
                sourceName: dialog.name ?? source.externalSourceId,
                sourceUsername: dialog.username,
            });
        }

        if (errors.length > 0) {
            throw new ApiError(StatusCodes.BAD_REQUEST, `${errors.length} source(s) could not be validated`, errors);
        }

        return resolved;
    };

    /**
     * Re-checks for duplicates inside the transaction so a concurrent request cannot slip a
     * second copy past the unique index; the index itself stays as the last line of defence.
     */
    private insertSources = async (
        loggedInUser: IUser,
        providerConnectionId: mongoose.Types.ObjectId,
        sources: TResolvedSource[],
        skipped: TSkippedJobSource[],
    ): Promise<TAddedJobSource[]> => {
        let created: TAddedJobSource[] = [];
        const session = await mongoose.startSession();

        try {
            await session.withTransaction(async () => {
                const alreadyStored = await this.findAlreadyStoredInSession(loggedInUser, sources, session);
                const pending = sources.filter((source) => !alreadyStored.has(source.externalSourceId));

                for (const source of sources) {
                    if (alreadyStored.has(source.externalSourceId)) {
                        skipped.push({ externalSourceId: source.externalSourceId, reason: "ALREADY_EXISTS" });
                    }
                }

                if (pending.length === 0) return;

                const inserted = await JobSourceModel.insertMany(
                    pending.map((source) => ({
                        userId: loggedInUser._id,
                        provider: source.provider,
                        type: source.type,
                        providerConnectionId,
                        externalSourceId: source.externalSourceId,
                        sourceName: source.sourceName,
                        sourceUsername: source.sourceUsername,
                        status: JOB_SOURCE_STATUS.ACTIVE,
                    })),
                    { session, ordered: true },
                );

                created = inserted.map((document) => ({
                    id: document._id,
                    provider: document.provider,
                    type: document.type,
                    externalSourceId: document.externalSourceId,
                    sourceName: document.sourceName,
                    sourceUsername: document.sourceUsername,
                    status: document.status,
                    createdAt: document.createdAt,
                    updatedAt: document.updatedAt,
                }));
            });
        } catch (error) {
            if (isDuplicateKeyError(error)) {
                logger.warn({ error, userId: String(loggedInUser._id) }, "Job source insert hit the unique index");
                throw new ApiError(StatusCodes.CONFLICT, "Some of these sources were added by another request, please try again");
            }
            throw error;
        } finally {
            await session.endSession();
        }

        return created;
    };

    private findAlreadyStoredInSession = async (loggedInUser: IUser, sources: TResolvedSource[], session: mongoose.ClientSession): Promise<Set<string>> => {
        if (sources.length === 0) return new Set();

        const stored = await JobSourceModel
            .find({
                userId: loggedInUser._id,
                provider: JOB_SOURCE_PROVIDER.TELEGRAM,
                externalSourceId: { $in: sources.map((source) => source.externalSourceId) },
                deletedAt: null,
            })
            .select("externalSourceId")
            .session(session)
            .lean();

        return new Set(stored.map((document) => document.externalSourceId));
    };
}

export default JobSourceService;
