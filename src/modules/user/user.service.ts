import { TCreateUserPayload, TUpdateAccountStatusPayload, TUpdateUserPayload, TGetAllUsersQuery } from "./user.types.ts";
import UserModel from "./user.model.ts";
import { ApiError } from "../../utils/index.ts";
import { StatusCodes } from "http-status-codes";
import { eventBus } from "../../events/index.ts";
import { USER_EVENTS, USER_ROLE, ACCOUNT_STATUS } from "./user.constant.ts";
class UserService {

    createUser = async (userData: TCreateUserPayload) => {
        try {
            const { email, password:ps, role, accountStatus } = userData;
            const user = await UserModel.findOne({ email }).lean();
            if (user) {
                throw new ApiError(StatusCodes.BAD_REQUEST, "Account already exists.");
            }

            const createdUser = await UserModel.create({
                email,
                password : ps,
                role,
                accountStatus
            });

            eventBus.emit(USER_EVENTS.USER.CREATED, userData);

            let { _id, password, ...rest } = createdUser.toObject();
            return { id: _id.toString(), ...rest };

        } catch (error) {
            throw error; 
        }
    }

    updateUser = async (userId: string, payload: TUpdateUserPayload) => {
        const user = await UserModel.findById(userId);
        if (!user) {
            throw new ApiError(StatusCodes.NOT_FOUND, "User not found.");
        }

        if (user.role !== USER_ROLE.ADMIN) {
            throw new ApiError(StatusCodes.BAD_REQUEST, "Only admin accounts can be edited.");
        }

        if (payload.email && payload.email !== user.email) {
            const existing = await UserModel.findOne({ email: payload.email });
            if (existing && existing._id.toString() !== userId) {
                throw new ApiError(StatusCodes.BAD_REQUEST, "Account with this email already exists.");
            }
            user.email = payload.email;
        }

        if (payload.password) {
            user.password = payload.password;
        }

        if (payload.accountStatus) {
            user.accountStatus = payload.accountStatus;
        }

        await user.save();

        let { _id, password, ...rest } = user.toObject();
        return { id: _id.toString(), ...rest };
    }

    updateAccountStatus = async (userId: string, payload: TUpdateAccountStatusPayload) => {
        const { accountStatus } = payload;

        const user = await UserModel.findById(userId);
        if (!user) {
            throw new ApiError(StatusCodes.NOT_FOUND, "User not found.");
        }

        if (user.role !== USER_ROLE.ADMIN) {
            throw new ApiError(StatusCodes.BAD_REQUEST, "Only admin accounts can be enabled or disabled.");
        }

        if (user.accountStatus === accountStatus) {
            throw new ApiError(StatusCodes.BAD_REQUEST, `Admin account is already ${accountStatus === ACCOUNT_STATUS.ACTIVE ? "active" : "inactive"}.`);
        }

        user.accountStatus = accountStatus;
        await user.save();

        let { _id, password, ...rest } = user.toObject();
        return { id: _id.toString(), ...rest };
    }

    getAllUsers = async (query: TGetAllUsersQuery) => {
        const { page = 1, limit = 20, search, role = USER_ROLE.ADMIN, accountStatus, sortBy = "createdAt", sortOrder = "desc" } = query;
        const skip = (page - 1) * limit;

        const filter: Record<string, any> = { role };

        if (accountStatus) {
            filter.accountStatus = accountStatus;
        }

        if (search) {
            filter.email = { $regex: search, $options: "i" };
        }

        const sortField = sortBy === "email" ? "email" : "createdAt";
        const sortDirection = sortOrder === "asc" ? 1 : -1;

        const [users, total] = await Promise.all([
            UserModel.find(filter)
                .select("-password")
                .sort({ [sortField]: sortDirection })
                .skip(skip)
                .limit(limit)
                .lean(),
            UserModel.countDocuments(filter),
        ]);

        const data = users.map(({ _id, password, ...rest }) => ({ id: _id.toString(), ...rest }));
        const totalPages = Math.ceil(total / limit);

        return {
            users: data,
            pagination: { page, limit, total, totalPages },
        };
    }
}

export default UserService;