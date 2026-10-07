import { parseStringDurationToMs } from "../utils/index.ts";
import { StringValue } from "ms";


const envConfig = {
    port: Number(process.env.PORT),

    // MongoDB Configuration

    mongodbConnectionString: process.env.MONGODB_URL!,

    // Super Admin Configuration
    superAdmin: {
        email: process.env.SUPER_ADMIN_EMAIL!,
        password: process.env.SUPER_ADMIN_PASSWORD!,
    },


    telegram: {
        apiId: Number(process.env.TELEGRAM_API_ID)!,
        apiHash: process.env.TELEGRAM_API_HASH!,
        sessionEncryptionKey: process.env.TELEGRAM_SESSION_ENCRYPTION_KEY!,
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