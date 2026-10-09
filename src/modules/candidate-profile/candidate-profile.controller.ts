import { StatusCodes } from "http-status-codes";
import type { NextFunction, Request, Response } from "express";
import { ApiError, ApiResponse } from "../../utils/index.ts";
import CandidateProfileService from "./candidate-profile.service.ts";
import type { TCreateCandidateProfileDTO, TUpdateCandidateProfileDTO } from "./candidate-profile.types.ts";

class CandidateProfileController {
    private readonly candidateProfileService: CandidateProfileService;

    constructor(candidateProfileService: CandidateProfileService) {
        this.candidateProfileService = candidateProfileService;
    }

    getProfile = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await this.candidateProfileService.getProfile(req.validatedUser);

            return ApiResponse.success(res, StatusCodes.OK, "Candidate profile fetched successfully", data);
        } catch (error) {
            return next(error);
        }
    };

    createProfile = async (req: Request, res: Response, next: NextFunction) => {
        const dto = req.validatedBody as TCreateCandidateProfileDTO;

        try {
            const data = await this.candidateProfileService.createProfile(req.validatedUser, dto);

            return ApiResponse.success(res, StatusCodes.CREATED, "Candidate profile created successfully", data);
        } catch (error) {
            return next(error);
        }
    };

    updateProfile = async (req: Request, res: Response, next: NextFunction) => {
        const dto = req.validatedBody as TUpdateCandidateProfileDTO;

        try {
            const data = await this.candidateProfileService.updateProfile(req.validatedUser, dto);

            return ApiResponse.success(res, StatusCodes.OK, "Candidate profile updated successfully", data);
        } catch (error) {
            return next(error);
        }
    };

    deleteProfile = async (req: Request, res: Response, next: NextFunction) => {
        try {
            await this.candidateProfileService.deleteProfile(req.validatedUser);

            return ApiResponse.success(res, StatusCodes.OK, "Candidate profile deleted successfully", null);
        } catch (error) {
            return next(error);
        }
    };

    getCompletion = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await this.candidateProfileService.getCompletion(req.validatedUser);

            return ApiResponse.success(res, StatusCodes.OK, "Profile completion fetched successfully", data);
        } catch (error) {
            return next(error);
        }
    };

    uploadResume = async (req: Request, res: Response, next: NextFunction) => {
        const file = req.file;

        if (!file) {
            return next(new ApiError(StatusCodes.BAD_REQUEST, "Resume file is required"));
        }

        try {
            const data = await this.candidateProfileService.uploadResume(req.validatedUser, file);

            return ApiResponse.success(res, StatusCodes.OK, "Resume uploaded successfully", data);
        } catch (error) {
            return next(error);
        }
    };
}

export default CandidateProfileController;
