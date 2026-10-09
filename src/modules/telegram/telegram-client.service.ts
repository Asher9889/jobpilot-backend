import { StoreSession, StringSession } from "teleproto/sessions";
// import { createInterface } from "node:readline/promises";
import { Api, TelegramClient } from "teleproto";
import "node:process";
import TelegramAccountModel from "./telegram.model.ts";
import { decrypt } from "../../utils/index.ts";
import mongoose from "mongoose";

class TelegramClientService {
    private readonly apiId: number;
    private readonly apiHash: string;
    private readonly client: TelegramClient;

    constructor(apiId: number, apiHash: string) {
        this.apiId = apiId;
        this.apiHash = apiHash;
        this.client = this.initClient();
    }

    /** Fresh client backed by an empty session — used for the QR sign-in flow. */
    initClient = () => {
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
        const account = await TelegramAccountModel.findOne({ userId: new mongoose.Types.ObjectId(userId) }, { userSessionString: 1 }).lean();

        if (!account) {
            throw new Error("Telegram account not connected");
        }

        if (!account.userSessionString) {
            throw new Error("Telegram session is missing");
        }

        return decrypt(account.userSessionString);
    }


    getClient = async (userId: string): Promise<TelegramClient> => {
        const sessionString = await this.getSessionString(userId);
        return this.createClientUsingSessionString(sessionString);
    }


    connect = async (): Promise<void> => {
        await this.client.connect();
    }

    getMe = async (): Promise<Api.User> => {
        return await this.client.getMe();
    }
}

export default TelegramClientService;