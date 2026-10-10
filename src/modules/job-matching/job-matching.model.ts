import { Schema, model } from "mongoose";
import { JOB_MATCHING_STATUS } from "./job-matching.constants.ts";

const jobMatchSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        jobId: {
            type: Schema.Types.ObjectId,
            ref: "Job",
            required: true,
        },
        score: {
            type: Number,
            required: true,
            min: 0,
            max: 100,
        },
        reason: {
            type: String,
            required: true,
        },
        matchedSkills: [String],
        missingSkills: [String],
        concerns: [String],
        jobMatchingStatus: {
            type: String,
            enum: Object.values(JOB_MATCHING_STATUS),
            default: JOB_MATCHING_STATUS.COMPLETED,
        },
    },
    { timestamps: true, versionKey: false }
);

jobMatchSchema.index({ userId: 1, jobId: 1 }, { unique: true });
// Supports GET /job-matches: scoped to a user, highest score first.
jobMatchSchema.index({ userId: 1, score: -1, createdAt: -1 });

const JobMatchModel = model("JobMatch", jobMatchSchema, "job_matches");

export default JobMatchModel;