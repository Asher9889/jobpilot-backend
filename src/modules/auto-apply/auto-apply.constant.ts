import envConfig from "../../config/envConfig.ts";

const AUTO_APPLY_QUEUE = {
  NAME: "auto-apply-queue",
  PREFIX: envConfig.queue.prefix,

  JOBS: {
    PROCESS_AUTO_APPLY: "PROCESS_AUTO_APPLY",
  },
} as const;

export { AUTO_APPLY_QUEUE };