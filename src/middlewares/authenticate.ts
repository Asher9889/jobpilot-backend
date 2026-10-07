import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/index.ts";
import { StatusCodes } from "http-status-codes";
import jwt from "jsonwebtoken";
import { envConfig } from "../config/index.ts";
import type { TAccessTokenPayload } from "../modules/auth/auth.types.ts";
import mongoose from "mongoose";
import { logger } from "../config/index.ts";
import UserModel from "../modules/user/user.model.ts";
import { ACCOUNT_STATUS } from "../modules/user/user.constant.ts";


async function authenticate(req: Request, res: Response, next: NextFunction) {

    try {
        logger.info("Authenticating user...");
        const accessToken = req.cookies.accessToken;

        if (!accessToken) {
            throw new ApiError(StatusCodes.UNAUTHORIZED, "Unauthorized: Access token is required");
        }

        const decoded = jwt.verify(accessToken, envConfig.jwtConfig.accessTokenSecret) as TAccessTokenPayload;

        if (!decoded?.id || !decoded?.role) {
            throw new ApiError(StatusCodes.UNAUTHORIZED, "Unauthorized: Invalid access token");
        }

        // check is valid id?
        const isValidId = mongoose.Types.ObjectId.isValid(decoded.id);

        if (!isValidId) {
            throw new ApiError(StatusCodes.UNAUTHORIZED, "Unauthorized: User not found");
        }

        const user = await UserModel.findById(decoded.id).select("-password").lean();

        if (!user) {
            throw new ApiError(StatusCodes.UNAUTHORIZED, "Unauthorized: User not found");
        }

        if (user.accountStatus !== ACCOUNT_STATUS.ACTIVE) {
            throw new ApiError(StatusCodes.UNAUTHORIZED, "Unauthorized: Account is inactive");
        }

        req.validatedUser = user;

        logger.info("User authenticated successfully");
        return next();
    } catch (error: any) {
        if (error instanceof jwt.TokenExpiredError) {
            return next(new ApiError(StatusCodes.UNAUTHORIZED, "Access token has expired"));
        }

        if (error instanceof jwt.JsonWebTokenError) {
            return next(new ApiError(StatusCodes.UNAUTHORIZED, "Invalid access token"));
        }

        if (error instanceof ApiError) {
            return next(error);
        }

        logger.error("Error occurred while authenticating user:", error);
        return next(new ApiError(StatusCodes.UNAUTHORIZED, error?.message || "Unauthorized"));
    }

}
export default authenticate;