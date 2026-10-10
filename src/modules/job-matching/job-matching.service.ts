import { StatusCodes } from "http-status-codes";
import { ApiError } from "../../utils/index.ts";
import { logger } from "../../config/index.ts";
import type { IUser } from "../user/user.model.ts";
import JobModel from "../jobs/jobs.model.ts";
import JobMatchModel from "./job-matching.model.ts";
import { REASON_EXCERPT_MAX_LENGTH } from "./job-matching.constants.ts";
import type { AIService } from "../ai/index.ts";
import type {
    JobMatchingPayload,
    JobMatchingStatus,
    TGetJobMatchesQuery,
    TGetJobMatchesResult,
    TJobApplication,
    TJobMatchDetail,
    TJobMatchListRow,
    TJobSourceMini,
    TJobSummary,
} from "./job-matching.types.ts";

/** Shape of a job_matches row after `.populate({ path: "jobId" })`. */
type TPopulatedJobDocument = {
    _id: unknown;
    company: string | null;
    roles?: string[];
    experience?: { minYears: number | null; maxYears: number | null } | null;
    location?: { city: string | null; state: string | null; country: string | null } | null;
    skills?: string[];
    application?: { email: string | null; phone: string | null; applyUrl: string | null; companyWebsite: string | null } | null;
    source?: {
        provider: string;
        externalSourceId: string;
        messageId: number;
        sourceName: string | null;
        sourceUsername: string | null;
        sourceType: string | null;
        messageDate: Date | null;
    } | null;
    rawMessage?: string;
    createdAt: Date;
};

type TPopulatedJobMatchDocument = {
    _id: unknown;
    score: number;
    reason: string;
    matchedSkills?: string[];
    missingSkills?: string[];
    concerns?: string[];
    jobMatchingStatus: JobMatchingStatus;
    createdAt: Date;
    jobId: TPopulatedJobDocument | null;
};

const toApplication = (application: TPopulatedJobDocument["application"]): TJobApplication => ({
    email: application?.email ?? null,
    phone: application?.phone ?? null,
    applyUrl: application?.applyUrl ?? null,
    companyWebsite: application?.companyWebsite ?? null,
});

const toJobSummary = (job: TPopulatedJobDocument): TJobSummary => ({
    id: job._id,
    company: job.company ?? null,
    roles: job.roles ?? [],
    experience: {
        minYears: job.experience?.minYears ?? null,
        maxYears: job.experience?.maxYears ?? null,
    },
    location: {
        city: job.location?.city ?? null,
        state: job.location?.state ?? null,
        country: job.location?.country ?? null,
    },
    skills: job.skills ?? [],
    application: toApplication(job.application),
    source: {
        provider: job.source?.provider ?? "",
        externalSourceId: job.source?.externalSourceId ?? "",
        messageId: job.source?.messageId ?? 0,
        sourceName: job.source?.sourceName ?? null,
        sourceUsername: job.source?.sourceUsername ?? null,
        sourceType: job.source?.sourceType ?? null,
        messageDate: job.source?.messageDate ?? null,
    },
    rawMessage: job.rawMessage ?? "",
    createdAt: job.createdAt,
});

/** Cut at a word boundary so the excerpt never ends mid-word. */
const toReasonExcerpt = (reason: string): string => {
    if (reason.length <= REASON_EXCERPT_MAX_LENGTH) return reason;

    const cut = reason.slice(0, REASON_EXCERPT_MAX_LENGTH);
    const lastSpace = cut.lastIndexOf(" ");
    const trimmed = lastSpace > REASON_EXCERPT_MAX_LENGTH / 2 ? cut.slice(0, lastSpace) : cut;

    return `${trimmed.trimEnd()}…`;
};

const toSourceMini = (source: TPopulatedJobDocument["source"]): TJobSourceMini | null =>
    source
        ? {
              provider: source.provider ?? "",
              sourceName: source.sourceName ?? null,
              sourceUsername: source.sourceUsername ?? null,
              sourceType: source.sourceType ?? null,
              messageId: source.messageId ?? 0,
              messageDate: source.messageDate ?? null,
          }
        : null;

const toMatchListRow = (doc: TPopulatedJobMatchDocument): TJobMatchListRow => ({
    id: doc._id,
    jobId: doc.jobId?._id ?? null,
    score: doc.score,
    company: doc.jobId?.company ?? null,
    roles: doc.jobId?.roles ?? [],
    matchedSkills: doc.matchedSkills ?? [],
    reasonExcerpt: toReasonExcerpt(doc.reason),
    source: doc.jobId ? toSourceMini(doc.jobId.source) : null,
    application: toApplication(doc.jobId?.application),
});

const toMatchDetail = (doc: TPopulatedJobMatchDocument): TJobMatchDetail => ({
    id: doc._id,
    jobId: doc.jobId?._id ?? null,
    score: doc.score,
    reason: doc.reason,
    matchedSkills: doc.matchedSkills ?? [],
    missingSkills: doc.missingSkills ?? [],
    concerns: doc.concerns ?? [],
    jobMatchingStatus: doc.jobMatchingStatus,
    createdAt: doc.createdAt,
    job: doc.jobId ? toJobSummary(doc.jobId) : null,
});

class JobMatchingService {
    private readonly aiService: AIService;

    constructor(aiService: AIService) {
        this.aiService = aiService;
    }

    handleJobMatching = async (jobPayload: JobMatchingPayload) => {
        try {
            // Implement the logic for handling the job matching here
            logger.info({ jobId: jobPayload.jobId, userId: jobPayload.userId }, "Handling job matching.");

            const result = await this.aiService.scoreJobToUser(jobPayload);

            const jobMatch = new JobMatchModel({
                jobId: jobPayload.jobId,
                userId: jobPayload.userId,
                score: result.score,
                reason: result.reason,
                matchedSkills: result.matchedSkills,
                missingSkills: result.missingSkills,
                concerns: result.concerns
            });

            await jobMatch.save(); // Save the job match to the database

            logger.info({ jobId: jobPayload.jobId, userId: jobPayload.userId, score: result.score }, "Job matching result saved successfully.");
        } catch (error) {
            logger.error({ jobId: jobPayload.jobId, userId: jobPayload.userId }, "Error occurred while processing job matching.");
            throw error;
        }
    };

    /** List view only: highest-scoring matches first, with the minimum fields the UI renders. */
    getMatchingJobs = async (loggedInUser: IUser, query: TGetJobMatchesQuery): Promise<TGetJobMatchesResult> => {
        const { page, limit } = query;
        const filter = { userId: loggedInUser._id };
        const skip = (page - 1) * limit;

        const [total, documents] = await Promise.all([
            JobMatchModel.countDocuments(filter),
            JobMatchModel.find(filter)
                .sort({ score: -1, createdAt: -1, _id: -1 })
                .skip(skip)
                .limit(limit)
                .populate({ path: "jobId", model: JobModel, select: "company roles source application" })
                .lean(),
        ]);

        const matches = (documents as unknown as TPopulatedJobMatchDocument[]).map(toMatchListRow);

        logger.info({ userId: String(loggedInUser._id), page, limit, total, returned: matches.length }, "Job matches fetched");

        return {
            matches,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    };

    /** Full detail for one match, including the raw scraped post. Scoped to the owner. */
    getMatchById = async (loggedInUser: IUser, matchId: string): Promise<TJobMatchDetail> => {
        const document = await JobMatchModel
            .findOne({ _id: matchId, userId: loggedInUser._id })
            .populate({ path: "jobId", model: JobModel })
            .lean();

        // A foreign or missing id returns the same 404, so ids cannot be probed.
        if (!document) {
            throw new ApiError(StatusCodes.NOT_FOUND, "Job match not found");
        }

        const detail = toMatchDetail(document as unknown as TPopulatedJobMatchDocument);

        logger.info({ userId: String(loggedInUser._id), matchId, score: detail.score }, "Job match detail fetched");

        return detail;
    };
}

export default JobMatchingService;
