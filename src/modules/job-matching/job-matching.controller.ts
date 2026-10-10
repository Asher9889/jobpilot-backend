import { StatusCodes } from "http-status-codes";
import type { NextFunction, Request, Response } from "express";
import { ApiResponse } from "../../utils/index.ts";
import JobMatchingService from "./job-matching.service.ts";
import type { TGetJobMatchesQuery } from "./job-matching.types.ts";

class JobMatchingController {
    private readonly jobMatchingService: JobMatchingService;

    constructor(jobMatchingService: JobMatchingService) {
        this.jobMatchingService = jobMatchingService;
    }

    getMatchingJobs = async (req: Request, res: Response, next: NextFunction) => {
        const loggedInUser = req.validatedUser;

        try {
            const query = req.validatedQuery as TGetJobMatchesQuery;
            const data = await this.jobMatchingService.getMatchingJobs(loggedInUser, query);

            return ApiResponse.success(res, StatusCodes.OK, "Job matches fetched successfully", data);
        } catch (error) {
            return next(error);
        }
    };

    getMatchById = async (req: Request, res: Response, next: NextFunction) => {
        const loggedInUser = req.validatedUser;
        const { id } = req.validatedParams as { id: string };

        try {
            const data = await this.jobMatchingService.getMatchById(loggedInUser, id);

            return ApiResponse.success(res, StatusCodes.OK, "Job match fetched successfully", data);
        } catch (error) {
            return next(error);
        }
    };
}

export default JobMatchingController;
