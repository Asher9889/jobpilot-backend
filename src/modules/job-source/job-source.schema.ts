import z from "zod";
import { JOB_SOURCE_PROVIDER, JOB_SOURCE_STATUS, JOB_SOURCE_TYPE } from "./job-source.constants.ts";

const TELEGRAM_CHAT_ID_PATTERN = /^-?\d{5,20}$/;

const PROVIDER_SUPPORTED_TYPES: Record<string, readonly string[]> = {
    [JOB_SOURCE_PROVIDER.TELEGRAM]: [JOB_SOURCE_TYPE.TELEGRAM_CHANNEL, JOB_SOURCE_TYPE.TELEGRAM_GROUP],
    [JOB_SOURCE_PROVIDER.LINKEDIN]: [JOB_SOURCE_TYPE.LINKEDIN],
    [JOB_SOURCE_PROVIDER.NAUKRI]: [JOB_SOURCE_TYPE.NAUKRI],
    [JOB_SOURCE_PROVIDER.INDEED]: [JOB_SOURCE_TYPE.INDEED],
};

export const jobSourceItemSchema = z
    .object({
        provider: z.enum(Object.values(JOB_SOURCE_PROVIDER), "Invalid provider"),
        type: z.enum(Object.values(JOB_SOURCE_TYPE), "Invalid type"),
        externalSourceId: z.string().trim().min(1, "externalSourceId is required"),
    })
    .superRefine((source, ctx) => {
        const supportedTypes = PROVIDER_SUPPORTED_TYPES[source.provider];

        if (supportedTypes && !supportedTypes.includes(source.type)) {
            ctx.addIssue({
                code: "custom",
                path: ["type"],
                message: `Type "${source.type}" is not valid for provider "${source.provider}"`,
            });
            return;
        }

        if (source.provider === JOB_SOURCE_PROVIDER.TELEGRAM && !TELEGRAM_CHAT_ID_PATTERN.test(source.externalSourceId)) {
            ctx.addIssue({
                code: "custom",
                path: ["externalSourceId"],
                message: 'Invalid externalSourceId: expected a Telegram chat id such as "-1001234567890"',
            });
        }
    });

export const createJobSourceRequestSchema = z.object({
    sources: z.array(jobSourceItemSchema).min(1, "At least one source is required"),
});

export const getJobSourcesQuerySchema = z.object({
    status: z.enum(Object.values(JOB_SOURCE_STATUS), "Invalid status").optional(),
    type: z.enum(Object.values(JOB_SOURCE_TYPE), "Invalid type").optional(),
    search: z.string().trim().min(1, "Search must not be empty").optional(),
    sortBy: z.enum(["createdAt", "sourceName"], "sortBy must be createdAt or sourceName").default("createdAt"),
    sortOrder: z.enum(["asc", "desc"], "sortOrder must be asc or desc").default("desc"),
});
