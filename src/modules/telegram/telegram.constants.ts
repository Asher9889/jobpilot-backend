import { envConfig } from "../../config/index.ts";

export const TELEGRAM_ACCOUNT_STATUS = {
  CONNECTED: "CONNECTED",
  DISCONNECTED: "DISCONNECTED",
  EXPIRED: "EXPIRED",
  REVOKED: "REVOKED",
  ERROR: "ERROR",
} as const;

export const TELEGRAM_QUEUE = {
  NAME: "telegram",
  PREFIX: envConfig.queue.prefix,

  JOBS: {
    PROCESS_MESSAGE: "PROCESS_MESSAGE",
  },
} as const;

export const TELEGRAM_EVENT = {
  CONNECTED: "telegram:connected",
  DISCONNECTED: "telegram:disconnected",
  ERROR: "telegram:error",
} as const;