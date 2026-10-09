import mongoose, { ObjectId } from "mongoose";
import { TTelegramAccountStatus } from "./telegram.types.ts";
import { TELEGRAM_ACCOUNT_STATUS } from "./telegram.constants.ts";

export interface ITelegramAccount extends mongoose.Document {
    userId: mongoose.Types.ObjectId;
    telegramUserId: string;
    username: string;
    firstName: string;
    lastName: string;
    avatarBase64: string | null;
    status: TTelegramAccountStatus;
    userSessionString: string;
    lastConnectedAt: Date;
    lastError: string | null;
}

export const telegramAccountSchema = new mongoose.Schema<ITelegramAccount>({
    userId: { type: mongoose.Types.ObjectId, ref: "User", required: true, unique: true },
    telegramUserId: { type: String, default: null },
    username: { type: String, default: null },
    firstName: { type: String, default: null },
    lastName: { type: String, default: null },
    avatarBase64: { type: String, default: null },
    status: { type: String, enum: Object.values(TELEGRAM_ACCOUNT_STATUS), default: TELEGRAM_ACCOUNT_STATUS.DISCONNECTED },
    userSessionString: { type: String,  default: null },
    lastConnectedAt: { type: Date,  },
    lastError: { type: String, default: null } 
}, { timestamps: true, versionKey: false });

// telegramAccountSchema.index({ userId: 1 }, { unique: true });

const TelegramAccountModel = mongoose.model<ITelegramAccount>("TelegramAccount", telegramAccountSchema, "telegram_accounts");

export default TelegramAccountModel;
