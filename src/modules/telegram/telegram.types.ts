import { TELEGRAM_ACCOUNT_STATUS } from "./telegram.constants.ts";

export type TTelegramAccountStatus = (typeof TELEGRAM_ACCOUNT_STATUS)[keyof typeof TELEGRAM_ACCOUNT_STATUS];