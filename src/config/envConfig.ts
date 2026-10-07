import { parseStringDurationToMs } from "../utils/index.ts";
import { StringValue } from "ms";
const envConfig = {
    port: process.env.PORT,

    telegram: {
        apiId: Number(process.env.TELEGRAM_API_ID)!,
        apiHash: process.env.TELEGRAM_API_HASH!
    },

    // JWT Configuration
    jwtConfig: {
        accessTokenSecret: process.env.JWT_ACCESS_TOKEN_SECRET!,
        accessTokenMaxAgeMs: parseStringDurationToMs(process.env.JWT_ACCESS_TOKEN_MAX_AGE as StringValue, "JWT_ACCESS_TOKEN_MAX_AGE"),

        refreshTokenSecret: process.env.JWT_REFRESH_TOKEN_SECRET!,
        refreshTokenMaxAgeMs: parseStringDurationToMs(process.env.JWT_REFRESH_TOKEN_MAX_AGE as StringValue, "JWT_REFRESH_TOKEN_MAX_AGE"),
    },


}

export default envConfig;