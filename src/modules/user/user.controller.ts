import { Request, Response, NextFunction } from "express";
import UserService from "./user.service.ts";
import { TCreateUserPayload, TUpdateAccountStatusPayload, TUpdateUserPayload, TGetAllUsersQuery } from "./user.types.ts";
import { ApiResponse } from "../../utils/index.ts";
import { StatusCodes } from "http-status-codes";

class UserController {
    private userService: UserService;

    constructor(userService: UserService) {
        this.userService = userService;
    }


    createUser = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const body = req.validatedBody as TCreateUserPayload;
            const data = await this.userService.createUser(body);
            return ApiResponse.success(res, StatusCodes.CREATED, "User created successfully", data);
        } catch (error) {
            next(error);
        }
    }

    updateUser = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.validatedParams as { id: string };
            const body = req.validatedBody as TUpdateUserPayload;
            const data = await this.userService.updateUser(id, body);
            return ApiResponse.success(res, StatusCodes.OK, "Admin account updated successfully", data);
        } catch (error) {
            next(error);
        }
    }

    updateAccountStatus = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.validatedParams as { id: string };
            const body = req.validatedBody as TUpdateAccountStatusPayload;
            const data = await this.userService.updateAccountStatus(id, body);
            return ApiResponse.success(res, StatusCodes.OK, "Admin account status updated successfully", data);
        } catch (error) {
            next(error);
        }
    }

    getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const query = req.validatedQuery as TGetAllUsersQuery;
            const data = await this.userService.getAllUsers(query);
            return ApiResponse.success(res, StatusCodes.OK, "Users fetched successfully", data);
        } catch (error) {
            next(error);
        }
    }
}

export default UserController;