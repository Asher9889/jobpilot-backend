import { Job, Worker } from "bullmq";
import { logger, redisConnectionOptions } from "../../config/index.ts";
import { TELEGRAM_QUEUE } from "./telegram.constants.ts";
import { TTelegramMessagePayload } from "./telegram.types.ts";
import TelegramService from "./telegram.service.ts";

class TelegramWorker {
    private readonly worker: Worker;
    private readonly telegramService: TelegramService;

    constructor(telegramService: TelegramService) {
        this.telegramService = telegramService;
        this.worker = this.createWorker();
    }

    private createWorker = () => {
        const worker = new Worker(TELEGRAM_QUEUE.NAME, this.handleJob, { connection: redisConnectionOptions, prefix: TELEGRAM_QUEUE.PREFIX, concurrency: 1 });
        return worker;
    }

    private handleJob = async (job: Job) => {
        switch (job.name) {
            case TELEGRAM_QUEUE.JOBS.PROCESS_MESSAGE:
                logger.info({ jobId: job.id, jobName: job.name }, `[${TELEGRAM_QUEUE.JOBS.PROCESS_MESSAGE}] Got a new job for processing Telegram message.`);
                await this.handleNewMessageJob(job);
                //     // Implement the logic for handling the transcribe audio job here
                break;
            // case MATERIAL_PROCESSING_QUEUE.JOBS.GENERATE_SUMMARY:
            //     logger.info({ jobId: job.id, jobName: job.name }, `["generate-summary"] Started Processing job.`);
            //     await this.handleGenerateSummaryJob(job);
            //     break;
            // case MATERIAL_PROCESSING_QUEUE.JOBS.CONVERT_TRANSCRIPTION_TO_VECTOR_DB:
            //     logger.info({ jobId: job.id, jobName: job.name }, `["convert-transcription-to-vector-db"] Started Processing job.`);
            //     await this.handleTranscriptEmbeddingsJob(job);
            //     break;
            default:
                logger.error({ jobId: job.id, jobName: job.name }, "Unknown job name, skipping");
            // throw new Error(`Unknown job name: ${job.name}`);
        }
    }

    private handleNewMessageJob = async (job: Job<TTelegramMessagePayload>) => {
        try {
            const { userId, msgId, chatId, text } = job.data;
            logger.info({ jobId: job.id, jobName: job.name, userId, msgId, chatId }, `Passing job to telegramService for processing.`);
            await this.telegramService.handleNewMessageJob(job.data);
        } catch (error) {
            throw error;
        }

    }
}

export default TelegramWorker;