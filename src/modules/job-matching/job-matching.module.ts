import JobMatchingService from "./job-matching.service.ts";
import { aiService } from "../ai/index.ts";
import JobMatchingController from "./job-matching.controller.ts";
import JobMatchingWorker from "./job-matching.worker.ts";
import JobMatchingEventListener from "./job-matching.event-listener.ts";
import { eventBus } from "../../events/index.ts";
import jobMatchingQueue from "./job-matching.queue.ts";

const jobMatchingWorker = new JobMatchingWorker();
const jobMatchingService = new JobMatchingService(aiService);
const jobMatchingController = new JobMatchingController(jobMatchingService);
const jobMatchingEventListener = new JobMatchingEventListener(eventBus, jobMatchingQueue);

export { jobMatchingService, jobMatchingController, jobMatchingEventListener };