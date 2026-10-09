import JobSourceService from "./job-source.service.ts";
import JobSourceController from "./job-source.controller.ts";
import { telegramClient } from "../telegram/telegram.module.ts";

const jobSourceService = new JobSourceService(telegramClient);
const jobSourceController = new JobSourceController(jobSourceService);

export { jobSourceService, jobSourceController };
