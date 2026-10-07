import { Response } from "express";

export class ApiResponse {
    // due to static we can call this method without creating an instance of the class
    static success(res: Response, statusCode = 200, message = "Success", data:any = []) {
        return res.status(statusCode).json({
            success: true,
            statusCode,
            message,
            data,
        });
    }

    static error(res: Response, statusCode = 500, message = "Something went wrong", errors?: any) {
        return res.status(statusCode).json({
            success: false,
            statusCode,
            message,
            errors: errors || [],
        });
    }
}


export class ApiError extends Error {
    success: boolean;
    statusCode: number;
    errors: any;

    constructor( statusCode: number, message: string, errors?: any) {
        super(message);
        this.success = false;
        this.statusCode = statusCode;
        this.errors = errors || [];

       Error.captureStackTrace(this);
    }

}

