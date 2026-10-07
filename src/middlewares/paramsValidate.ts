import z, { ZodObject} from "zod";
import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/index.ts";
import { StatusCodes } from "http-status-codes";
import { logger } from "../config/index.ts";

const paramsValidate = (schema: ZodObject) => (req: Request, res: Response, next: NextFunction) => {
    logger.info("Validating request params against schema:" + JSON.stringify(req.params));
    const result = schema.safeParse(req.params);

    
    if (!result.success) {
        logger.info("Schema validation failed result: " + JSON.stringify(result));
        const errors = result.error.issues.map((error) => ({ field: error.path[0], message: error.message }))
        throw new ApiError(StatusCodes.BAD_REQUEST, "Please provide valid data", errors);
    }

    req.validatedParams = result.data;

    next();
};


export default paramsValidate;