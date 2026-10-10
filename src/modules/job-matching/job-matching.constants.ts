import { envConfig } from "../../config/index.ts";

const JOB_MATCHING_STATUS = {
  PENDING: "PENDING",
  FAILED: "FAILED",
  COMPLETED: "COMPLETED"
} as const;

/** List rows carry a truncated reason; the full text lives on the detail endpoint. */
const REASON_EXCERPT_MAX_LENGTH = 120;

const JOB_MATCHING_QUEUE = {
  NAME: "job-matching-queue",
  PREFIX: envConfig.queue.prefix,

  JOBS: {
    PROCESS_JOB_MATCHING: "PROCESS_JOB_MATCHING",
  },
} as const;

export { JOB_MATCHING_STATUS, JOB_MATCHING_QUEUE, REASON_EXCERPT_MAX_LENGTH };