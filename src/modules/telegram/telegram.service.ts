import { TelegramClient } from "teleproto"

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
    startQrAuth = async (onQrCode:(url:string, expires:number) => void, signal: AbortSignal) => {
        const user = await this.telegramClient.signInUserWithQrCode(
            { apiId: this.apiId, apiHash: this.apiHash },
            {
                qrCode: async ({ token, expires }) => {
                    const url = `tg://login?token=${token.toString("base64url")}`;
                    onQrCode(url, expires)
                    // qrcode.generate(url, { small: true });
                    // console.log(`QR expires in ${expires}s — scan from Telegram > Devices > Link Desktop Device`);
                },
                // password: (hint) => prompt2FA(hint),       // your own resolver
                onError: (err) => { console.error(err); },
                abortSignal: signal, // abort.abort() stops polling, rejects with AbortError
            },
        );

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
}

export default TelegramService;