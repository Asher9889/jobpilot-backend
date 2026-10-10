import z from "zod";
import mongoose from "mongoose";

export const jobMatchResultSchema = z.object({
  score: z.number().min(0).max(100),
  reason: z.string(),
  matchedSkills: z.array(z.string()).default([]),
  missingSkills: z.array(z.string()).default([]),
  concerns: z.array(z.string()).default([]),
});

export const getJobMatchesQuerySchema = z.object({
  page: z.coerce.number().int().min(1, "page must be at least 1").default(1),
  limit: z.coerce.number().int().min(1, "limit must be at least 1").max(50, "limit must be at most 50").default(20),
});

export const jobMatchIdParamSchema = z.object({
  id: z.string().refine((value) => mongoose.Types.ObjectId.isValid(value), { message: "Please provide a valid ID" }),
});