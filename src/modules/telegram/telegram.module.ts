import envConfig from "../../config/envConfig.ts";
import TelegramClientService from "./telegram-client.service.ts";
import TelegramController from "./telegram.controller.ts";
import TelegramService from "./telegram.service.ts";
import TelegramListenerService from "./telegram-event-listener.service.ts";
import { eventBus } from "../../events/index.ts";
import TelegramWorker from "./telegram.worker.ts";

const { apiId, apiHash} = envConfig.telegram;

const telegramClient = new TelegramClientService(apiId, apiHash);
// telegramClient.connect();
const telegramListenerService = new TelegramListenerService(telegramClient, eventBus);
const telegramService = new TelegramService(apiId, apiHash, telegramClient );
const telegramController = new TelegramController(telegramService);
const telegramWorker = new TelegramWorker();

export { telegramClient, telegramController, telegramListenerService, telegramWorker };