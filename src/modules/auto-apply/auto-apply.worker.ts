import { Worker, Job } from "bullmq";
import { AUTO_APPLY_QUEUE } from "./auto-apply.constant.ts";
import envConfig from "../../config/envConfig.ts";
import { logger, redisConnectionOptions } from "../../config/index.ts";
import { readonly } from "zod";
import { AutoApplyQueuePayload } from "./auto-apply.types.ts";
import AutoApplyService from "./auto-apply.service.ts";


export default class AutoApplyWorker {
    private readonly worker: Worker;
    private readonly autoApplyService: AutoApplyService;

    constructor(autoApplyService: AutoApplyService) {
        this.autoApplyService = autoApplyService;
        this.worker = this.initializeWorker();

    }

    initializeWorker = () => {
        const worker = new Worker(AUTO_APPLY_QUEUE.NAME, this.handleJob, { connection: redisConnectionOptions, prefix: envConfig.queue.prefix, concurrency: 1 } );
        return worker;
    }

    private handleJob = async (job: Job) => {
        try {
            switch (job.name) {
                case AUTO_APPLY_QUEUE.JOBS.PROCESS_AUTO_APPLY:
                    logger.info({ jobId: job.id, userId: job.data.userId }, "New JobPost auto-apply received via worker.");
                    await this.handleAutoApplyJob(job);
                    break;
                default:
                    logger.error({ jobId: job.id }, `Unknown job name: ${job.name}, skipping.`);
            }
            // Implement the logic for processing the job here
        } catch (error) {
            console.error(`Error processing job ${job.id}:`, error);
            throw error; // Rethrow the error to let BullMQ handle retries
        }
    }

    private handleAutoApplyJob = async (job: Job<AutoApplyQueuePayload>) => {
        try {
            logger.info({ jobId: job.id, userId: job.data.userId }, "Finally start processing auto-apply job via worker.");
            await this.autoApplyService.handleAutoApplyJob(job.data);
        } catch (error) {
            logger.error({ jobId: job.id, userId: job.data.userId, err: error }, "Error processing auto-apply job.");
            throw error; // Rethrow the error to let BullMQ handle retries
        }
    }
}