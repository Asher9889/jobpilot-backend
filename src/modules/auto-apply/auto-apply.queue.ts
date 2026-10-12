import { Queue } from "bullmq";
import { AUTO_APPLY_QUEUE } from "./auto-apply.constant.ts";
import { redisConnectionOptions } from "../../config/index.ts";

const autoApplyQueue = new Queue(AUTO_APPLY_QUEUE.NAME, { connection: redisConnectionOptions, prefix: AUTO_APPLY_QUEUE.PREFIX });

autoApplyQueue.on("error", (error) => {
    console.error("Error in Auto Apply Queue:", error);
});

autoApplyQueue.on("waiting", (job) => {
    console.log(`Auto Apply Job ${job.id} is waiting.`);
});


export default autoApplyQueue;