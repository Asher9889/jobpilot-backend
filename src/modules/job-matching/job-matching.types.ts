import { JOB_MATCHING_STATUS } from "./job-matching.constants.ts";
import { jobMatchResultSchema } from "./job-matching.schema.ts";
import z from "zod";

export type JobMatchingStatus = typeof JOB_MATCHING_STATUS[keyof typeof JOB_MATCHING_STATUS];

export type JobMatchingResult = z.infer<typeof jobMatchResultSchema>;

export interface JobMatchingPayload {
  jobId: string;
  userId: string;
}