import { TelegramClient } from "teleproto";
import { NewMessage, NewMessageEvent } from "teleproto/events";
import TelegramClientService from "./telegram-client.service.ts";
import { logger } from "../../config/index.ts";
import EventBus from "../../events/eventBus.ts";
import { TELEGRAM_ACCOUNT_STATUS, TELEGRAM_EVENT, TELEGRAM_QUEUE } from "./telegram.constants.ts";
import TelegramAccountModel from "./telegram.model.ts";
import JobSourceModel from "../job-source/job-source.model.ts";
import { JOB_SOURCE_STATUS } from "../job-source/job-source.constants.ts";
import telegramQueue from "./telegram.queue.ts";
import { TTelegramMessagePayload } from "./telegram.types.ts";

export default class TelegramListenerService {
    private readonly telegramClientService: TelegramClientService;
    private readonly clients = new Map<string, TelegramClient>();
    private readonly eventBus: EventBus;

    constructor(telegramClientService: TelegramClientService, eventBus: EventBus) {
        this.telegramClientService = telegramClientService;
        this.eventBus = eventBus;
    }

    register() {
        logger.info("Registering Telegram Listener for Telegram Events...");
        this.eventBus.on(TELEGRAM_EVENT.CONNECTED, this.startListeningForUser);
    }


    startListeningForUser = async (payload?: { userId: string }) => {
        try {
            const userId = payload?.userId;
            if (!userId || typeof userId !== "string") {
                throw new Error(`Expected a userId string, received ${JSON.stringify(payload)}`);
            }

            // Prevent duplicate listener registration
            if (this.clients.has(userId)) {
                return;
            }

            const client = await this.telegramClientService.getClient(userId);

            // getClient() only builds the client — without connect() it never opens an
            // MTProto connection, so no updates are ever dispatched to the handler.
            try {
                await client.connect();
            } catch (error) {
                await client.disconnect().catch(() => undefined);
                throw error;
            }

            client.addEventHandler(
                (event) => this.handleNewMessage(userId, event),
                new NewMessage({})
            );

            this.clients.set(userId, client);

            logger.info({ totalListeners: this.clients.size }, "Total Telegram listeners registered");

            logger.info({ userId }, `Telegram listener started for user`);
        } catch (error) {
            logger.error({ userId: payload?.userId, err: error }, "Failed to start Telegram listener for user");
        }
    };

    stopListeningForUser = async (userId: string) => {
        const client = this.clients.get(userId);

        if (!client) {
            logger.info({ userId }, `Telegram listener was not running for user`);
            return;
        }

        try {
            await client.disconnect();
        } catch (error) {
            logger.warn({ userId, error }, `Failed to disconnect Telegram listener cleanly`);
        } finally {
            this.clients.delete(userId);
        }

        logger.info({ userId }, `Telegram listener stopped for user`);
    };

    private handleNewMessage = async (userId: string, event: NewMessageEvent) => {
        const msg = event.message;

        const accounts = await JobSourceModel.find(
            { userId: userId, status: JOB_SOURCE_STATUS.ACTIVE },
            { externalSourceId: 1 }
        ).lean();

        // ignore messages from unregistered sources
        if(!accounts.some((a) => a.externalSourceId === msg.chatId?.toString())) {
            // logger.info({ userId, msgId: msg.id, chatId: msg.chatId?.toString() }, "New Telegram message from unregistered source");
            return;
        }

        console.log("New Telegram message", msg.text);

        const payload: TTelegramMessagePayload = { userId, msgId: msg.id, chatId: msg.chatId?.toString(), text: msg.text  };

        // adding data to queue for processing.
        logger.info({ userId, msgId: msg.id, chatId: msg.chatId?.toString() }, "Adding Telegram message to processing queue");
        await telegramQueue.add(TELEGRAM_QUEUE.JOBS.PROCESS_MESSAGE, payload, { removeOnComplete: true, removeOnFail: false, attempts: 5, backoff: { type: "exponential", delay: 10_000 } });


        // logger.info({
        //     userId,
        //     msgId: msg.id,
        //     chatId: msg.chatId?.toString(),
        //     senderId: msg.senderId?.toString(),
        //     isChannel: event.isChannel,
        //     out: msg.out,
        //     media: msg.media?.className ?? null,
        //     text: msg.text,
        // }, "New Telegram message");
    }


    restoreListeners = async (): Promise<void> => {
        const accounts = await TelegramAccountModel.find(
            { status: TELEGRAM_ACCOUNT_STATUS.CONNECTED, userSessionString: { $ne: null } },
            { userId: 1 },
        ).lean();

        // logger.info({ count: accounts.length }, "Restoring Telegram listeners");

        // allSettled: one expired session must not abort the others
        const results = await Promise.allSettled(
            accounts.map((a) => this.startListeningForUser({ userId: a.userId.toString() })),
        );

        const failed = results.filter((r) => r.status === "rejected").length;
        logger.info({ restored: results.length - failed, failed }, "Telegram listener restore complete");
    }
}