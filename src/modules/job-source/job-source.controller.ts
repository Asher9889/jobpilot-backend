import { StatusCodes } from "http-status-codes";
import { Request, Response, NextFunction } from "express";
import JobSourceService from "./job-source.service.ts";
import { ApiResponse } from "../../utils/index.ts";
import { TCreateJobSourceDTO, TGetJobSourcesQuery } from "./job-source.types.ts";

class JobSourceController {
    private readonly jobSourceService: JobSourceService;

    constructor(jobSourceService: JobSourceService) {
        this.jobSourceService = jobSourceService;
    }

    addJobSource = async (req: Request, res: Response, next: NextFunction) => {
        const loggedInUser = req.validatedUser;
        const { sources } = req.validatedBody as TCreateJobSourceDTO;

        try {
            const result = await this.jobSourceService.addJobSource(loggedInUser, sources);

            const message = result.created.length > 0 ? "Job sources added successfully" : "No new job sources to add";

            return ApiResponse.success(res, StatusCodes.CREATED, message, result);
        } catch (error) {
            return next(error);
        }
    };

    getJobSources = async (req: Request, res: Response, next: NextFunction) => {
        const loggedInUser = req.validatedUser;

        try {
            const query = req.validatedQuery as TGetJobSourcesQuery;
            const data = await this.jobSourceService.getJobSources(loggedInUser, query);

            return ApiResponse.success(res, StatusCodes.OK, "Job sources fetched successfully", data);
        } catch (error) {
            return next(error);
        }
    };
}

export default JobSourceController;
