import z from "zod";
import { JOB_SOURCE_PROVIDER, JOB_SOURCE_TYPE } from "./job-source.constants.ts";
import mongoose from "mongoose";

const createJobSourceSchema = z.array(
    z.object({
        provider: z.enum(Object.values(JOB_SOURCE_PROVIDER), "Invalid provider"),
        type: z.enum(Object.values(JOB_SOURCE_TYPE), "Invalid type"),
        externalSourceId: z.string().trim().refine((val) => mongoose.Types.ObjectId.isValid(val), "Invalid externalSourceId"),
    })
);

export const createJobSourceRequestSchema = z.object({
    sources: createJobSourceSchema
});