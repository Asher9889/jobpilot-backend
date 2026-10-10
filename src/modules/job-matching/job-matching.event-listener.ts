import { Job, Queue } from "bullmq";
import EventBus from "../../events/eventBus.ts";
import { JOB_MATCHING_QUEUE, JobMatchingPayload } from "./index.ts";
import JobMatchingWorker from "./job-matching.worker.ts";
import { logger } from "../../config/index.ts";

class JobMatchingEventListener {
    private readonly eventBus: EventBus;
    private readonly jobMatchingQueue:Queue; 

    constructor(eventBus: EventBus, jobMatchingQueue: Queue) {
        this.eventBus = eventBus;
        this.jobMatchingQueue = jobMatchingQueue;

    }

    register() { 
        logger.info("Registering Job Matching Event Listener for New Jobs...");
        this.eventBus.on(JOB_MATCHING_QUEUE.JOBS.PROCESS_JOB_MATCHING, this.handleJobMatching);
    }

    private handleJobMatching = async (payload: JobMatchingPayload) => {
        try{
            logger.info({ jobId: payload.jobId, userId: payload.userId }, "JobPost Matching job added to queue.");
            const queuedJobMatching = await this.jobMatchingQueue.add(JOB_MATCHING_QUEUE.JOBS.PROCESS_JOB_MATCHING, payload, { removeOnComplete: true, removeOnFail: false, attempts: 5, backoff: { type: "exponential", delay: 8_000 } });

            logger.info({ jobId: queuedJobMatching.id, userId: queuedJobMatching.data.userId }, "Job Post added to queue for processing job matching.");

        } catch (error) {
            console.error("Error processing job matching:", error);
        }
       
    }

}

export default JobMatchingEventListener;