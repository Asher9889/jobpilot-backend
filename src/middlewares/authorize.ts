import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ApiError } from "../utils/index.ts";

const authorize = (...roles: string[]) => (req: Request, res: Response, next: NextFunction) => {
    const user = req.validatedUser;

    if (!user) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, "Authentication required");
    }

    if (!roles.includes(user.role)) {
        throw new ApiError(StatusCodes.FORBIDDEN, "You are not authorized to perform this action");
    }

    next();
};

export default authorize;