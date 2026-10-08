import { Request, Response, NextFunction } from "express";
import JobSourceService from "./job-source.service.ts";
import { TCreateJobSourceDTO } from "./job-source.types.ts";

class JobSourceController {
    private readonly jobSourceService: JobSourceService;

    constructor(jobSourceService: JobSourceService) {
        this.jobSourceService = jobSourceService;
    }

    addJobSource = async (req: Request, res: Response, next: NextFunction) => {
        const loggedInUser = req.validatedUser;
        const { sources } = req.validatedBody as TCreateJobSourceDTO;

        try {
            
        } catch (error) {
            
        }
    }
}

export default JobSourceController;