import { Queue } from "bullmq";
import { TELEGRAM_QUEUE } from "./telegram.constants.ts";
import { redisConnectionOptions } from "../../config/index.ts";

const telegramQueue = new Queue(TELEGRAM_QUEUE.NAME, { connection: redisConnectionOptions, prefix: TELEGRAM_QUEUE.PREFIX });

telegramQueue.on('waiting', (job) => {
  console.log(`A job with ID ${job.id} is waiting`);
});

telegramQueue.on("error", (job) => {
  console.log(`${job.name} has failed with reason ${job.message}`);
});

export default telegramQueue;