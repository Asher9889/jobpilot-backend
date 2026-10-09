import { TelegramClient, Api } from "teleproto"
import mongoose from "mongoose";
import { logger } from "../../config/index.ts"
import { TELEGRAM_ACCOUNT_STATUS, TELEGRAM_EVENT } from "./telegram.constants.ts";
import TelegramAccountModel from "./telegram.model.ts";
import type { IUser } from "../user/user.model.ts";
import { encrypt, decrypt } from "../../utils/crypto.ts";
import UserModel from "../user/user.model.ts";
import TelegramClientService from "./telegram-client.service.ts";
import { ApiError } from "../../utils/index.ts";
import { StatusCodes } from "http-status-codes";
import { JobSourceModel } from "../job-source/job-source.model.ts";
import { telegramListenerService } from "./telegram.module.ts";
import type { TDisconnectTelegramResult, TTelegramMessagePayload } from "./telegram.types.ts";
import { eventBus } from "../../events/index.ts";
class TelegramService {
    private readonly apiId: number;
    private readonly apiHash: string;
    private readonly telegramClientService: TelegramClientService;
    private readonly telegramClient: TelegramClient;


    constructor(apiId: number, apiHash: string, telegramClientService: TelegramClientService) {
        this.apiId = apiId;
        this.apiHash = apiHash;
        this.telegramClientService = telegramClientService;
        this.telegramClient = telegramClientService.initClient();
    }

    /**
     * Start QR based user auth
     */
    startQrAuth = async (cb: (url: string, expires: number) => void, signal: AbortSignal, loggedInUser: IUser) => {
        try {
            await this.telegramClient.connect();
            const user = await this.telegramClient.signInUserWithQrCode(
                { apiId: this.apiId, apiHash: this.apiHash },
                {
                    qrCode: async ({ token, expires }) => {
                        const url = `tg://login?token=${token.toString("base64url")}`;
                        cb(url, expires);
                    },
                    // password: (hint) => prompt2FA(hint),       // your own resolver
                    onError: (err) => { console.error("error during auth", err); },
                    abortSignal: signal, // abort.abort() stops polling, rejects with AbortError
                },
            );

            const profile = await this.getProfileSummary(user);

            const userSessionString = this.telegramClient.session.save();
            if (!userSessionString) {
                throw new Error("Failed to retrieve user session string after QR authentication");
            }
            const encryptedSession = encrypt(userSessionString);

            const savedSession = await TelegramAccountModel.findOneAndUpdate(
                { userId: loggedInUser._id },
                {
                    userId: loggedInUser._id,
                    telegramUserId: profile.id,
                    username: profile.username,
                    firstName: profile.firstName,
                    lastName: profile.lastName,
                    status: TELEGRAM_ACCOUNT_STATUS.CONNECTED,
                    avatarBase64: profile.photo?.avatarBase64 || null,
                    userSessionString: encryptedSession,
                    lastConnectedAt: new Date(),
                    lastError: null,
                },
                { upsert: true, new: true }
            );

            await UserModel.findByIdAndUpdate(loggedInUser._id, { telegram: savedSession._id });

            logger.info("User successfully connected to Telegram and session saved in database");

            // create a event listener to listen for updates from telegram server
            const payload: { userId: string } = { userId: loggedInUser._id.toString() };
            eventBus.emit(TELEGRAM_EVENT.CONNECTED, payload);
            // telegramListener.startListeningForUser(loggedInUser._id.toString());

            return profile; 
        } catch (error) {
            await new TelegramAccountModel({
                userId: loggedInUser._id.toString(),
                // username: profile.username,
                // firstName: profile.firstName,
                // lastName: profile.lastName,
                status: TELEGRAM_ACCOUNT_STATUS.ERROR,
                // userSessionString,
                // lastConnectedAt: new Date(),
                lastError: error instanceof Error ? error.message : "Failed to connect to Telegram",
            }).save();
            console.log("Error during QR authentication:", error);
            logger.error({ error }, "Error during QR authentication");
            throw error;
        }

    }

    /**
     * Shared precondition for anything that needs a live Telegram session.
     * Throws instead of letting decrypt(null) blow up later as a 500.
     */
    private requireConnectedAccount = async (userId: IUser["_id"]) => {
        const account = await TelegramAccountModel.findOne({ userId }).lean();

        if (!account) {
            throw new ApiError(StatusCodes.NOT_FOUND, "Telegram account not connected");
        }

        if (account.status !== TELEGRAM_ACCOUNT_STATUS.CONNECTED) {
            throw new ApiError(StatusCodes.BAD_REQUEST, `Telegram account is not connected (status: ${account.status})`);
        }

        if (!account.userSessionString) {
            throw new ApiError(StatusCodes.CONFLICT, "Telegram session is missing, please reconnect Telegram and try again");
        }

        return account;
    };

    getAvailableSources = async (loggedInUser: IUser) => {
        await this.requireConnectedAccount(loggedInUser._id);

        const sessionString = await this.telegramClientService.getSessionString(loggedInUser._id.toString());
        logger.info("Fetched session string for fetching available sources");
        const client = this.telegramClientService.createClientUsingSessionString(sessionString);
        try { 
            await client.connect();
            const dialogs = await client.getDialogs({});

            const monitoredSources = await JobSourceModel.find({ userId: loggedInUser._id }, { externalSourceId: 1 }).lean();

            return dialogs
                .filter((dialog) => dialog.isGroup || dialog.isChannel)
                .map((dialog) => ({
                    id: dialog.id?.toString() ?? null,
                    name: dialog.name ?? null,
                    title: dialog.title ?? null,
                    isUser: dialog.isUser,
                    isGroup: dialog.isGroup,
                    isChannel: dialog.isChannel,
                    isCommunity: dialog.isCommunity,
                    pinned: dialog.pinned,
                    archived: dialog.archived,
                    folderId: dialog.folderId ?? null,
                    unreadCount: dialog.unreadCount,
                    unreadMentionsCount: dialog.unreadMentionsCount,
                    lastMessageText: dialog.message?.message ?? null,
                    lastMessageDate: dialog.date ?? null,
                    isMonitored: monitoredSources.some((source) => source.externalSourceId === dialog.id?.toString()),
                }));
        } catch (error) {
            logger.error({ error }, "Error fetching available sources from Telegram");
            throw error;;
        } 
        finally {
            await client.disconnect();
        }
    };

    /**
     * Unlink Telegram from this account: revoke the auth key server-side where possible,
     * stop the listener, wipe the stored session and clear the user's pointer.
     * Idempotent — disconnecting twice (or when never connected) is a 200 no-op.
     */
    disconnectTelegram = async (loggedInUser: IUser): Promise<TDisconnectTelegramResult> => {
        const account = await TelegramAccountModel.findOne({ userId: loggedInUser._id }).lean();

        if (!account || account.status !== TELEGRAM_ACCOUNT_STATUS.CONNECTED) {
            // Leave no stale pointer behind regardless of which branch we took.
            await UserModel.updateOne({ _id: loggedInUser._id }, { $set: { telegram: null } });

            logger.info({ userId: String(loggedInUser._id), status: account?.status ?? null }, "Telegram already disconnected");

            return {
                status: TELEGRAM_ACCOUNT_STATUS.DISCONNECTED,
                revokedRemotely: false,
                alreadyDisconnected: true,
            };
        }

        const revokedRemotely = await this.revokeSessionRemotely(account);

        await telegramListenerService.stopListeningForUser(loggedInUser._id.toString());

        const session = await mongoose.startSession();
        try {
            await session.withTransaction(async () => {
                // await TelegramAccountModel.deleteOne(
                //     { _id: account._id },
                //     { session },
                // );
                await TelegramAccountModel.updateOne(
                    { _id: account._id },
                    { $set: { status: TELEGRAM_ACCOUNT_STATUS.DISCONNECTED, userSessionString: null, lastError: null } },
                    { session },
                );
                await UserModel.updateOne({ _id: loggedInUser._id }, { $set: { telegram: null } }, { session });
            });
        } finally {
            await session.endSession();
        }

        logger.info({ userId: String(loggedInUser._id), revokedRemotely }, "Telegram disconnected");

        return {
            status: TELEGRAM_ACCOUNT_STATUS.DISCONNECTED,
            revokedRemotely,
            alreadyDisconnected: false,
        };
    };

    /**
     * handle new message event from telegram server and add it to the queue for processing.
     */

    handleNewMessageJob = async (jobPayload: TTelegramMessagePayload) => {
        const { userId, msgId, chatId, text } = jobPayload;
        // Implement the logic for handling the new message job here
    }

    /**
     * Best-effort auth.logOut(). Returns false rather than throwing when Telegram
     * cannot be reached — the local session is wiped either way.
     */
    private revokeSessionRemotely = async (account: { userId: mongoose.Types.ObjectId; userSessionString: string | null }): Promise<boolean> => {
        if (!account.userSessionString) {
            return false;
        }

        let client: TelegramClient | null = null;

        try {
            const sessionString = decrypt(account.userSessionString);
            client = this.telegramClientService.createClientUsingSessionString(sessionString);
            await client.connect();
            const revoked = await client.logOut();
            logger.info({ userId: String(account.userId), revoked }, "auth.logOut result");
            return revoked;
        } catch (error) {
            logger.warn({ userId: String(account.userId), error }, "Could not revoke Telegram session remotely");
            return false;
        } finally {
            if (client) {
                try {
                    await client.disconnect();
                } catch {
                    // logOut() already disconnects; ignore a second failure.
                }
            }
        }
    };

    private getProfileSummary = async (user: Api.TypeUser) => {
        const u = user instanceof Api.User ? user : undefined;

        const avatarBuffer = u?.photo instanceof Api.UserProfilePhoto
            ? await this.telegramClient.downloadProfilePhoto(u)   // Buffer | undefined
            : undefined;

        return {
            id: user.id.toString(),
            firstName: u?.firstName ?? null,
            lastName: u?.lastName ?? null,
            fullName: [u?.firstName, u?.lastName].filter(Boolean).join(" ") || null,
            username: u?.username ?? null,
            phone: u?.phone ?? null,                 // omit if frontend doesn't need it
            photo: u?.photo instanceof Api.UserProfilePhoto
                ? {
                    photoId: u.photo.photoId.toString(),
                    dcId: u.photo.dcId,
                    hasVideo: !!u.photo.hasVideo,
                    // tiny always-available thumb (base64 JPEG):
                    thumbBase64: u.photo.strippedThumb
                        ? `data:image/jpeg;base64,${Buffer.from(u.photo.strippedThumb).toString("base64")}`
                        : null,
                    // full-size image as base64 (extra RPC, ~50-200KB):
                    avatarBase64: avatarBuffer?.length
                        ? `data:image/jpeg;base64,${avatarBuffer.toString("base64")}`
                        : null,
                }
                : null,
            // status: this.serializeStatus(u?.status),
            isPremium: !!u?.premium,
            isVerified: !!u?.verified,
            isSelf: !!u?.self,
        };
    }

}

export default TelegramService;