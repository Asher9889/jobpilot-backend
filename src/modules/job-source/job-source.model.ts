import mongoose from "mongoose";
import { JOB_SOURCE_PROVIDER, JOB_SOURCE_STATUS, JOB_SOURCE_TYPE } from "./job-source.constants.ts";
import { TJobSourceProvider, TJobSourceStatus, TJobSourceType } from "./job-source.types.ts";

export interface IJobSource extends mongoose.Document {
    userId: mongoose.Types.ObjectId;
    provider: TJobSourceProvider;
    type: TJobSourceType;
    providerConnectionId: mongoose.Types.ObjectId;
    externalSourceId: string;
    sourceName: string;
    sourceUsername: string;
    status: TJobSourceStatus;
    deletedAt: Date | null;
}


const jobSourceSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },

    provider: {
        type: String,
        enum: Object.values(JOB_SOURCE_PROVIDER),
        required: true,
    },

    type: {
        type: String,
        enum: Object.values(JOB_SOURCE_TYPE),
        required: true,
    },

    providerConnectionId: {
        type: mongoose.Types.ObjectId,
        // ref: "TelegramAccount", due to dynamic nature of provider, we cannot set a static ref here. We will handle the population manually in the service layer.
        required: true,
        index: true,
    },

    // Those IDs belong to the external system, hence: is a generic and appropriate name.
    externalSourceId: {
        type: String,
        required: true,
    },

    sourceName: {
        type: String,
        required: true,
        trim: true,
    },

    sourceUsername: {
        type: String,
        default: null,
    },

    status: {
        type: String,
        enum: Object.values(JOB_SOURCE_STATUS),
        default: JOB_SOURCE_STATUS.ACTIVE,
    },

    deletedAt: {
        type: Date,
        default: null,
    },
}, { timestamps: true, versionKey: false }
);

export const jobSourceModel = mongoose.model<IJobSource>("JobSource", jobSourceSchema, "job_sources");

export default jobSourceModel;