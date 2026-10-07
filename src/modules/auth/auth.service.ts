import jwt, { JwtPayload } from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import { envConfig } from "../../config/index.ts";

import { TLoginRequestDTO, TRefreshTokenPayload, generateJWTTokensResponse } from "./auth.types.ts";
import { UserModel } from "../user/index.ts";
import { ApiError } from "../../utils/index.ts";


class AuthService {

    login = async (loginPayload: TLoginRequestDTO) => {

        try {
            const { email, password } = loginPayload;

            // 1. check existence
            const user = await UserModel.findOne({ email });
            if (!user) {
                throw new ApiError(StatusCodes.BAD_REQUEST, "Please register first or user correct credentials.");
            }

            // 2. check password
            const isPasswordValid = await user.comparePassword(password);
            if (!isPasswordValid) {
                throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid password or email");
            }

            // 3. generate tokens
            const tokens = user.generateTokens({ id: user._id.toString(), role: user.role });
            return tokens;
        } catch (error) {
            throw error;
        }


    }

    refresh = async (refresToken: string): Promise<{ tokens: generateJWTTokensResponse, user: Record<string, any> }> => {
        try {
            const decodedToken = jwt.verify(refresToken, envConfig.jwtConfig.refreshTokenSecret) as JwtPayload & TRefreshTokenPayload;
            const user = await UserModel.findById(decodedToken.id);
            if (!user) {
                throw new ApiError(StatusCodes.UNAUTHORIZED, "User not found. Please login again.");
            }
            const tokens = user.generateTokens({ id: user._id.toString(), role: user.role });

            const userObj = user.toObject();
            const { _id, password, ...rest } = userObj;
            const safeUser = { id: _id.toString(), ...rest };

            return { tokens, user: safeUser };
        } catch (error) {
            throw error;
        }
    }

    getMe = async (id: string) => {
        try {
            const user = await UserModel.findById(id).select("-password").lean();

            if (!user) {
                throw new ApiError(
                    StatusCodes.UNAUTHORIZED,
                    "User not found. Please login again."
                );
            }

            let { _id, password, ...rest } = user;
            return { id: _id.toString(), ...rest };
        } catch (error) {
            throw error;
        }
    }

};

export default AuthService;