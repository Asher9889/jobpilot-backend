import { logger } from "../../config/index.ts";
import EventBus from "../../events/eventBus.ts";
import { AUTO_APPLY_QUEUE } from "./auto-apply.constant.ts";
import { AutoApplyQueuePayload } from "./auto-apply.types.ts";
import { autoApplyQueue } from "./index.ts";
import { Queue } from "bullmq";

class AutoApplyEventListener {
    private readonly eventBus: EventBus;
    private readonly autoApplyQueue: typeof autoApplyQueue;

    constructor(eventBus: EventBus, autoApplyQueue: Queue) {
        this.eventBus = eventBus;
        this.autoApplyQueue = autoApplyQueue;
    }

    register() {
        logger.info("Registering Auto Apply Event Listener for New Jobs...");
        this.eventBus.on(AUTO_APPLY_QUEUE.JOBS.PROCESS_AUTO_APPLY, this.handleAutoApply);
    }

    private handleAutoApply = async (payload: AutoApplyQueuePayload) => {
        try {
            logger.info({ jobId: payload.jobId, userId: payload.userId }, "Auto Apply job added to queue.");
            const job = await autoApplyQueue.add(AUTO_APPLY_QUEUE.JOBS.PROCESS_AUTO_APPLY, payload,
                { removeOnComplete: true, removeOnFail: false, attempts: 5, backoff:
                    { type: "exponential", delay: 30_000 }
                });

            logger.info({ jobId: job.id, userId: job.data.userId }, "Job added to auto-apply queue for processing.");
            // Implement the logic for handling auto apply here
        } catch (error) {
            logger.error({ jobId: payload.jobId, userId: payload.userId }, "Error occurred during adding a JobPost to auto-apply queue.");
        }
    }
}