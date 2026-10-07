import { NextFunction, Request, Response } from "express"
import { ApiError } from "../index.ts";
import { StatusCodes } from "http-status-codes";

function routeNotExistsHandler(req:Request, res:Response, next:NextFunction) {
    return next(new ApiError(StatusCodes.NOT_FOUND, "Please check your api endpoints"))
}

export default routeNotExistsHandler; 