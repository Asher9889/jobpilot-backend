import { StoreSession, StringSession } from "teleproto/sessions";
// import { createInterface } from "node:readline/promises";
import { Api, TelegramClient } from "teleproto";
import "node:process";
import TelegramAccountModel from "./telegram.model.ts";
import { decrypt } from "../../utils/index.ts";

class TelegramClientService {
    private readonly apiId: number;
    private readonly apiHash: string;
    private readonly client: TelegramClient;

    constructor(apiId: number, apiHash: string) {
        this.apiId = apiId;
        this.apiHash = apiHash;
        this.client = this.initClient();
    }

    private initClient = () => {
        /**
         * empty string means create a new sessionString.
         * after that using it we will connect to telegram server.
         */
        const session = new StringSession("");
        const client = new TelegramClient(session, this.apiId, this.apiHash, {
            connectionRetries: 5,
        });

        return client;
    }


    createClientUsingSessionString = (sessionString: string): TelegramClient => {
        const session = new StringSession(sessionString);
        const client = new TelegramClient(session, this.apiId, this.apiHash, {
            connectionRetries: 5,
        });
        return client;
    }

    async getSessionString(userId: string): Promise<string> {
        const account = await TelegramAccountModel.findOne({ userId }, { userSessionString: 1 }).lean();

        if (!account) {
            throw new Error("Telegram account not connected");
        }

        return decrypt(account.userSessionString);
    }

    getClient = (): TelegramClient => {
        if (!this.client) {
            throw new Error("Client is not initiated Yet. Please First Create a client")
        }
        return this.client;
    }


    connect = async (): Promise<void> => {
        await this.client.connect();
    }

    getMe = async (): Promise<Api.User> => {
        return await this.client.getMe();
    }
}

export default TelegramClientService;