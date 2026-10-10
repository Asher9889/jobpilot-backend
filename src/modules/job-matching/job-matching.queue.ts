import { Queue } from "bullmq";
import { envConfig, redisConnectionOptions } from "../../config/index.ts";
import { JOB_MATCHING_QUEUE } from "./job-matching.constants.ts";


const jobMatchingQueue = new Queue(JOB_MATCHING_QUEUE.NAME, { connection: redisConnectionOptions, prefix: envConfig.queue.prefix });

jobMatchingQueue.on("waiting", (job) => {
  console.log(`A job with ID ${job.id} is waiting`);
});

jobMatchingQueue.on("error", (job) => {
  console.log(`${job.name} has failed with reason ${job.message}`);
});

export default jobMatchingQueue;