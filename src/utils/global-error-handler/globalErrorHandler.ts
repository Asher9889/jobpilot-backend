import { StatusCodes } from "http-status-codes";
import { ApiError, ApiResponse } from "../index.ts";
import { NextFunction, Request, Response } from "express";

export default function globalErrorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
    // console.log("Global Error handler:", err);
    if(err instanceof ApiError){
        return ApiResponse.error(res, err.statusCode, err.message, err.errors)
    }
    return ApiResponse.error(res, StatusCodes.INTERNAL_SERVER_ERROR, err.message)
}