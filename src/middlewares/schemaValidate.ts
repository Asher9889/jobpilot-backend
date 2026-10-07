import z, { ZodObject} from "zod";
import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/index.ts";
import { StatusCodes } from "http-status-codes";
import { logger } from "../config/index.ts";

const schemaValidate = (schema: ZodObject) => (req: Request, res: Response, next: NextFunction) => {
    // logger.info("Validating request body against schema:" + JSON.stringify(req.body));
    const result = schema.safeParse(req.body);

    
    if (!result.success) {
        logger.info("Schema validation failed result: " + JSON.stringify(result));
        const errors = result.error.issues.map((error) => ({ field: error.path[0], message: error.message }))
        const msgs = errors.map((error) => error.message).join(", ");
        throw new ApiError(StatusCodes.BAD_REQUEST,  msgs || "Please provide valid data", errors);
    }

    req.validatedBody = result.data;

    logger.info("Schema validation successful. Proceeding to next middleware.");
    logger.info("Validated request body: " + JSON.stringify(result.data));
    next();
};


export default schemaValidate;