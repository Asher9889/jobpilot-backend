import { Job } from "bullmq";
import { JobMatchingPayload } from "./index.ts";
import { AIService } from "../ai/index.ts";
import JobMatchModel from "./job-matching.model.ts";
import { logger } from "../../config/index.ts";

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
    }
}

export default JobMatchingService;