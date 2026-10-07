import { TelegramClient, Api } from "teleproto"
import { logger } from "../../config/index.ts"
class TelegramService {
    private readonly telegramClient: TelegramClient;
    private readonly apiId: number;
    private readonly apiHash: string;


    constructor(telegramClient: TelegramClient, apiId: number, apiHash: string) {
        this.telegramClient = telegramClient;
        this.apiId = apiId;
        this.apiHash = apiHash
    }

    /**
     * Start Telegram authentication for a user.
     * Sends an OTP to the user's Telegram account.
     */
    startAuth = (userId: string, phone: string) => {
        // this.telegramClient.start()
    }

    /**
     * Start QR based user auth
     */
    startQrAuth = async (cb: (url: string, expires: number) => void, signal: AbortSignal) => {
        const user = await this.telegramClient.signInUserWithQrCode(
            { apiId: this.apiId, apiHash: this.apiHash },
            {
                qrCode: async ({ token, expires }) => {
                    const url = `tg://login?token=${token.toString("base64url")}`;
                    cb(url, expires)
                    // qrcode.generate(url, { small: true });
                    // console.log(`QR expires in ${expires}s — scan from Telegram > Devices > Link Desktop Device`);
                },
                // password: (hint) => prompt2FA(hint),       // your own resolver
                onError: (err) => { console.error(err); },
                abortSignal: signal, // abort.abort() stops polling, rejects with AbortError
            },
        );

        const userSessionString =  this.telegramClient.session.save();

        logger.info({sessionString: userSessionString}, "User Auth Session String");

        return user;
    }
    /**
     * Verify the OTP received by the user.
     */
    async verifyCode(userId: string, code: string) { }

    /**
     * Verify Telegram 2FA password if the account has it enabled.
     */
    async verifyPassword(userId: string, password: string) { }

    /**
     * Check whether the Telegram account is authenticated.
     */
    async isAuthenticated(userId: string) { }

    /**
     * Get the authenticated Telegram user.
     */
    async getCurrentUser(userId: string) { }

    /**
     * Get the current session.
     * Used internally for persistence.
     */
    async getSession(userId: string) { }

    /**
     * Disconnect the Telegram account.
     */
    async logout(userId: string): Promise<void> { }

    getProfileSummary = async (user: Api.TypeUser) => {
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