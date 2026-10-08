import JobSourceService from "./job-source.service.ts";
import JobSourceController from "./job-source.controller.ts";

const jobSourceService = new JobSourceService();
const jobSourceController = new JobSourceController(jobSourceService);

export { jobSourceService, jobSourceController };