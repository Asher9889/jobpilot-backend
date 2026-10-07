import z from "zod";

import { loginSchema } from "./auth.schema.ts";
import { TUserRole } from "../user/index.ts";


type TLoginRequestDTO = z.infer<typeof loginSchema>;


type TAccessTokenPayload = {
    id: string;     
    role: TUserRole;   
};
type TRefreshTokenPayload = {
    id: string;    
};
type generateTokensPayload = TAccessTokenPayload;
type generateJWTTokensResponse = {
    accessToken: string;
    refreshToken: string;
};




export type { TUserRole, TLoginRequestDTO, TAccessTokenPayload, TRefreshTokenPayload, generateTokensPayload, generateJWTTokensResponse };