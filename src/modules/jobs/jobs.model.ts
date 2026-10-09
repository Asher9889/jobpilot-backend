
import { Schema, model } from "mongoose";
import { JOB_SOURCE_PROVIDER, JOB_SOURCE_TYPE } from "../job-source/job-source.constants.ts";

const jobSchema = new Schema(
    {
        company: {
            type: String,
            default: null,
            trim: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        roles: {
            type: [String],
            default: [],
        },

        experience: {
            _id: false,
            minYears: { type: Number, default: null },
            maxYears: { type: Number, default: null },
        },

        location: {
            _id: false,
            city: { type: String, default: null },
            state: { type: String, default: null },
            country: { type: String, default: null },
        },

        skills: {
            type: [String],
            default: [],
        },

        application: {
            _id: false,
            email: { type: String, default: null },
            phone: { type: String, default: null },
            applyUrl: { type: String, default: null },
            companyWebsite: { type: String, default: null },
        },

        source: {
            _id: false,
            provider: {
                type: String,
                enum: Object.values(JOB_SOURCE_PROVIDER),
                required: true,
            },
            externalSourceId: {
                type: String,
                required: true,
            },
            messageId: {
                type: Number,
                required: true,
            },
            sourceName: { type: String, default: null }, // channle or group name
            sourceUsername: { type: String, default: null }, // channel or group username
            sourceType: { type: String, enum: Object.values(JOB_SOURCE_TYPE), default: null }, // channel or group type
            messageDate: { type: Date, default: null },
        },

        rawMessage: {
            type: String,
            required: true,
        },
    },
    { timestamps: true, versionKey: false }
);

jobSchema.index(
    {
        "source.provider": 1,
        "source.externalSourceId": 1,
        "source.messageId": 1,
    },
    { unique: true }
);

const JobModel = model("Job", jobSchema);

export default JobModel;
