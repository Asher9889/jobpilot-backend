import { JOB_SOURCE_PROVIDER, JOB_SOURCE_TYPE, JOB_SOURCE_STATUS, SKIPPED_JOB_SOURCES_REASON } from "./job-source.constants.ts";
import z from "zod";
import { createJobSourceRequestSchema, getJobSourcesQuerySchema, jobSourceItemSchema } from "./job-source.schema.ts";

export type TJobSourceProvider = (typeof JOB_SOURCE_PROVIDER)[keyof typeof JOB_SOURCE_PROVIDER];

export type TJobSourceType = (typeof JOB_SOURCE_TYPE)[keyof typeof JOB_SOURCE_TYPE];

export type TJobSourceStatus = (typeof JOB_SOURCE_STATUS)[keyof typeof JOB_SOURCE_STATUS];

export type TCreateJobSourceDTO = z.infer<typeof createJobSourceRequestSchema>;

export type TCreateJobSourceItemDTO = z.infer<typeof jobSourceItemSchema>;

export type TSkippedJobSourceReason = (typeof SKIPPED_JOB_SOURCES_REASON)[keyof typeof SKIPPED_JOB_SOURCES_REASON];

export type TSkippedJobSource = {
    externalSourceId: string;
    reason: TSkippedJobSourceReason;
};

export type TAddedJobSource = {
    id: unknown;
    provider: TJobSourceProvider;
    type: TJobSourceType;
    externalSourceId: string;
    sourceName: string;
    sourceUsername: string | null;
    status: TJobSourceStatus;
    createdAt: Date;
    updatedAt: Date;
};

export type TAddJobSourceResult = {
    created: TAddedJobSource[];
    skipped: TSkippedJobSource[];
};

export type TGetJobSourcesQuery = z.infer<typeof getJobSourcesQuerySchema>;

/** A list row is structurally identical to a freshly created row, so the frontend can reuse one type. */
export type TJobSourceListItem = TAddedJobSource;

export type TGetJobSourcesResult = {
    sources: TJobSourceListItem[];
};