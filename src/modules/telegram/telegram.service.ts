import { TelegramClient, Api } from "teleproto"
import { logger } from "../../config/index.ts"
import { TELEGRAM_ACCOUNT_STATUS } from "./telegram.constants.ts";
import TelegramAccountModel from "./telegram.model.ts";
import type { IUser } from "../user/user.model.ts";
import { encrypt } from "../../utils/crypto.ts";
import UserModel from "../user/user.model.ts";
import TelegramClientService from "./telegram-client.service.ts";
import { ApiError } from "../../utils/index.ts";
import { StatusCodes } from "http-status-codes";
class TelegramService {
    private readonly apiId: number;
    private readonly apiHash: string;
    private readonly telegramClientService: TelegramClientService;
    private readonly telegramClient: TelegramClient;


    constructor(apiId: number, apiHash: string, telegramClientService: TelegramClientService) {
        this.apiId = apiId;
        this.apiHash = apiHash;
        this.telegramClientService = telegramClientService;
        this.telegramClient = telegramClientService.getClient();
    }

    /**
     * Start QR based user auth
     */
    startQrAuth = async (cb: (url: string, expires: number) => void, signal: AbortSignal, loggedInUser: IUser) => {
        try {
            const user = await this.telegramClient.signInUserWithQrCode(
                { apiId: this.apiId, apiHash: this.apiHash },
                {
                    qrCode: async ({ token, expires }) => {
                        const url = `tg://login?token=${token.toString("base64url")}`;
                        cb(url, expires);
                    },
                    // password: (hint) => prompt2FA(hint),       // your own resolver
                    onError: (err) => { console.error(err); },
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


            logger.info({ sessionString: userSessionString }, "User Auth Session String");

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
            throw error;
        }

    }

    getAvailableSources = async (loggedInUser: IUser) => {
        const account = await TelegramAccountModel.findOne({ userId: loggedInUser._id }).lean();
        if (!account) {
            throw new ApiError(StatusCodes.NOT_FOUND, "Telegram account not connected");
        }
        
        const sessionString = await this.telegramClientService.getSessionString(loggedInUser._id.toString());
        logger.info("Fetched session string for fetching available sources");
        const client = this.telegramClientService.createClientUsingSessionString(sessionString);
        try { 

            await client.connect();
            const dialogs = await client.getDialogs({});

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
                }));
        } catch (error) {
            logger.error({ error }, "Error fetching available sources from Telegram");
            throw error;;
        } 
        finally {
            await client.disconnect();
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