import z from "zod";
import { extractedJobSchema } from "./ai-extracted-job.schema.ts";

export type TExtractedJob = z.infer<typeof extractedJobSchema>;