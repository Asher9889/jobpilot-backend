import { JOB_SOURCE_PROVIDER, JOB_SOURCE_TYPE, JOB_SOURCE_STATUS } from "./job-source.constants.ts";
import z from "zod";
import { createJobSourceRequestSchema } from "./job-source.schema.ts";

export type TJobSourceProvider = (typeof JOB_SOURCE_PROVIDER)[keyof typeof JOB_SOURCE_PROVIDER];

export type TJobSourceType = (typeof JOB_SOURCE_TYPE)[keyof typeof JOB_SOURCE_TYPE];

export type TJobSourceStatus = (typeof JOB_SOURCE_STATUS)[keyof typeof JOB_SOURCE_STATUS];

export type TCreateJobSourceDTO = z.infer<typeof createJobSourceRequestSchema>;