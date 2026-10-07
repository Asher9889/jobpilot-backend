import authRoutes from "./auth.routes.ts";
import { generateTokensPayload, TUserRole, generateJWTTokensResponse, TAccessTokenPayload } from "./auth.types.ts";

export type { generateTokensPayload, TUserRole, generateJWTTokensResponse, TAccessTokenPayload };
export { authRoutes };