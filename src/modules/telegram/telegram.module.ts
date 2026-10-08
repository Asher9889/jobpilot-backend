import envConfig from "../../config/envConfig.ts";
import TelegramClientService from "./telegram-client.service.ts";
import TelegramController from "./telegram.controller.ts";
import TelegramService from "./telegram.service.ts";


const { apiId, apiHash} = envConfig.telegram;

const telegramClient = new TelegramClientService(apiId, apiHash);
telegramClient.connect();
const telegramService = new TelegramService(apiId, apiHash, telegramClient );
const telegramController = new TelegramController(telegramService);

export { telegramClient, telegramController };