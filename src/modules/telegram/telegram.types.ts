import { TJobSourceType } from "../job-source/job-source.types.ts";
import { TELEGRAM_ACCOUNT_STATUS } from "./telegram.constants.ts";

export type TTelegramAccountStatus = (typeof TELEGRAM_ACCOUNT_STATUS)[keyof typeof TELEGRAM_ACCOUNT_STATUS];

export type TDisconnectTelegramResult = {
    status: TTelegramAccountStatus;
    revokedRemotely: boolean;
    alreadyDisconnected: boolean;
};

export type TTelegramMessagePayload = {
    userId: string;
    msgId: number;
    chatId: string;
    text: string;
    sourceName: string; 
    sourceUsername: string; 
    sourceType: TJobSourceType
}