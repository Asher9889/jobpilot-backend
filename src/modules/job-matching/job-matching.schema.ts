import z from "zod";

export const jobMatchResultSchema = z.object({
  score: z.number().min(0).max(100),
  reason: z.string(),
  matchedSkills: z.array(z.string()).default([]),
  missingSkills: z.array(z.string()).default([]),
  concerns: z.array(z.string()).default([]),
});