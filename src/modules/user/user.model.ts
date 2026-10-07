import mongoose from "mongoose";
import argon2 from "argon2";
import jwt from "jsonwebtoken";

import { ACCOUNT_STATUS, USER_ROLE } from "./user.constant.ts";
import { envConfig } from "../../config/index.ts";
import { generateTokensPayload, TUserRole, generateJWTTokensResponse } from "../auth/index.ts";
import { TAccountStatus } from "./user.types.ts";


export interface IUser extends mongoose.Document {
    email: string;
    password: string;
    role: TUserRole;
    accountStatus: TAccountStatus;
    comparePassword(password: string): Promise<boolean>;
    generateTokens(data: generateTokensPayload): generateJWTTokensResponse;
}

export const userSchema = new mongoose.Schema<IUser>({
    email: { type: String, required: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, enum: Object.values(USER_ROLE), required: true },
    accountStatus: { type: String, enum: Object.values(ACCOUNT_STATUS), default: ACCOUNT_STATUS.ACTIVE, required: true },
}, { timestamps: true, versionKey: false });

userSchema.index({ email: 1 }, { unique: true });

userSchema.methods.comparePassword = async function (password: string) {
    return await argon2.verify(this.password, password);
}

userSchema.methods.generateTokens = function(data: {id: string, role: string}){
    const accessToken = jwt.sign(data, envConfig.jwtConfig.accessTokenSecret, { expiresIn: envConfig.jwtConfig.accessTokenMaxAgeMs });
    const refreshToken = jwt.sign(data, envConfig.jwtConfig.refreshTokenSecret, { expiresIn: envConfig.jwtConfig.refreshTokenMaxAgeMs });
    return { accessToken, refreshToken }; 
}
 

userSchema.pre("save", async function () {
    if (!this.isModified("password")) {
        return;
    }

    this.password = await argon2.hash(this.password);
});



const UserModel = mongoose.model<IUser>("User", userSchema, "users");

export default UserModel;