import { Job, Worker } from "bullmq";
import { envConfig, logger, redisConnectionOptions } from "../../config/index.ts";
import { JOB_MATCHING_QUEUE } from "./job-matching.constants.ts";
import { JobMatchingPayload } from "./job-matching.types.ts";
import { jobMatchingService } from "./job-matching.module.ts";

class JobMatchingWorker {
    private readonly worker: Worker;
    constructor() {
        this.worker = this.initializeWorker();
    }

    private initializeWorker = () => {
        const worker = new Worker(JOB_MATCHING_QUEUE.NAME, this.handleJob, { connection: redisConnectionOptions, prefix: envConfig.queue.prefix, concurrency: 1 });
        return worker;
    };

    private handleJob = async (job: Job) => {
        switch (job.name) {
            case JOB_MATCHING_QUEUE.JOBS.PROCESS_JOB_MATCHING:
                await this.handleJobMatching(job);
                break;
            default:
                logger.error({ queueJobId: job.id, jobName: job.name }, "Unknown job name, skipping");
        }
    };

    handleJobMatching = async (job: Job<JobMatchingPayload>) => {
        try {
            logger.info({ queueJobId: job.id, jobPostId: job.data?.jobId, userId: job.data?.userId }, "Handling job matching.");
            await jobMatchingService.handleJobMatching(job.data);
        } catch (error) {
            // Optional chaining: the log line must never throw and mask the original error.
            logger.error({ queueJobId: job.id, jobPostId: job.data?.jobId, userId: job.data?.userId, err: error }, "Error handling job matching.");
            throw error;
        }
    };
}

export default JobMatchingWorker;
