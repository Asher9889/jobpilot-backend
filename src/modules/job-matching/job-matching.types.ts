import z from "zod";
import { JOB_MATCHING_STATUS } from "./job-matching.constants.ts";
import { getJobMatchesQuerySchema, jobMatchResultSchema } from "./job-matching.schema.ts";

export type JobMatchingStatus = typeof JOB_MATCHING_STATUS[keyof typeof JOB_MATCHING_STATUS];

export type JobMatchingResult = z.infer<typeof jobMatchResultSchema>;

export interface JobMatchingPayload {
  jobId: string;
  userId: string;
}

export type TGetJobMatchesQuery = z.infer<typeof getJobMatchesQuerySchema>;

/** How to reach the employer. Any channel may be absent. Shared by the list row and the detail. */
export interface TJobApplication {
  email: string | null;
  phone: string | null;
  applyUrl: string | null;
  companyWebsite: string | null;
}

/** Job fields surfaced on the detail endpoint. */
export interface TJobSummary {
  id: unknown;
  company: string | null;
  roles: string[];
  experience: { minYears: number | null; maxYears: number | null };
  location: { city: string | null; state: string | null; country: string | null };
  skills: string[];
  application: TJobApplication;
  source: {
    provider: string;
    externalSourceId: string;
    messageId: number;
    sourceName: string | null;
    sourceUsername: string | null;
    sourceType: string | null;
    messageDate: Date | null;
  };
  /** The raw scraped post. Excluded from the list endpoint to keep list payloads small. */
  rawMessage: string;
  createdAt: Date;
}

/**
 * Trimmed source info for a list row — a subset of the detail's `job.source`, using the same
 * field names so the frontend can share one type. `externalSourceId` is omitted (not rendered);
 * `messageId` is kept so the UI can deep-link to the original post.
 */
export interface TJobSourceMini {
  provider: string;
  sourceName: string | null;
  sourceUsername: string | null;
  sourceType: string | null;
  messageId: number;
  messageDate: Date | null;
}

/** What the list UI actually renders — deliberately minimal. */
export interface TJobMatchListRow {
  id: unknown;
  jobId: unknown;
  score: number;
  company: string | null;
  roles: string[];
  matchedSkills: string[];
  /** First ~120 chars of `reason`, cut at a word boundary. */
  reasonExcerpt: string;
  source: TJobSourceMini | null;
  application: TJobApplication;
}

/** Everything about one match plus its full job, for the detail view. */
export interface TJobMatchDetail {
  id: unknown;
  jobId: unknown;
  score: number;
  reason: string;
  matchedSkills: string[];
  missingSkills: string[];
  concerns: string[];
  jobMatchingStatus: JobMatchingStatus;
  createdAt: Date;
  job: TJobSummary | null;
}

export interface TGetJobMatchesResult {
  matches: TJobMatchListRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
