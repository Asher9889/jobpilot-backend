import { StoreSession } from "teleproto/sessions";
// import { createInterface } from "node:readline/promises";
import { Api, TelegramClient } from "teleproto";
import "node:process";

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
        const session = new StoreSession("telegram-session");
        // const rl = createInterface({ input: process.stdin, output: process.stdout });
        const client = new TelegramClient(session, this.apiId, this.apiHash, {
            connectionRetries: 5,
        });
        
        return client;
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