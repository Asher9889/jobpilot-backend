import z from "zod";
import { SKILL_PROFICIENCY_LEVELS, WORK_MODE } from "./candidate-profile.constants.ts";

const CURRENT_YEAR = new Date().getFullYear();
const MIN_GRADUATION_YEAR = 1950;
const MAX_TOTAL_YEARS = 60;

const stringItem = z.string().trim().min(1, "Value must not be empty");
const stringList = z.array(stringItem);
const workModeList = z.array(z.enum(Object.values(WORK_MODE), "Invalid work mode"));

export const skillSchema = z.object({
    name: stringItem,
    level: z.enum(Object.values(SKILL_PROFICIENCY_LEVELS), "Invalid proficiency level").nullish(),
});

export const educationItemSchema = z.object({
    institution: z.string().trim().min(1).nullish(),
    degree: z.string().trim().min(1).nullish(),
    fieldOfStudy: z.string().trim().min(1).nullish(),
    graduationYear: z.number().int()
        .min(MIN_GRADUATION_YEAR, `graduationYear must be ${MIN_GRADUATION_YEAR} or later`)
        .max(CURRENT_YEAR, `graduationYear must not be later than ${CURRENT_YEAR}`)
        .nullish(),
});

const experienceTotalYears = z.number().int()
    .min(0, "totalYears must be at least 0")
    .max(MAX_TOTAL_YEARS, `totalYears must be at most ${MAX_TOTAL_YEARS}`)
    .nullish();

const experienceCurrentRole = z.string().trim().min(1).nullish();

export const experienceCreateSchema = z.object({
    totalYears: experienceTotalYears,
    currentRole: experienceCurrentRole,
    previousRoles: stringList.default([]),
});

/** Every field optional so a PATCH can send only the slice it wants to change. */
export const experienceUpdateSchema = z.object({
    totalYears: experienceTotalYears,
    currentRole: experienceCurrentRole,
    previousRoles: stringList.optional(),
});

const preferencesMinSalary = z.number().int().min(0, "minSalary must be at least 0").nullish();

export const preferencesCreateSchema = z.object({
    preferredRoles: stringList.default([]),
    preferredLocations: stringList.default([]),
    workModes: workModeList.default([]),
    employmentTypes: stringList.default([]),
    minSalary: preferencesMinSalary,
});

/** Arrays are optional so sending only `{ minSalary }` must not wipe the lists. */
export const preferencesUpdateSchema = z.object({
    preferredRoles: stringList.optional(),
    preferredLocations: stringList.optional(),
    workModes: workModeList.optional(),
    employmentTypes: stringList.optional(),
    minSalary: preferencesMinSalary,
});

const headline = z.string().trim().min(1).max(200, "headline must be at most 200 characters").nullish();
const summary = z.string().trim().max(2000, "summary must be at most 2000 characters").nullish();

/** `.strict()` rejects `profileCompletion`, `resumeObjectKey` (and any other unknown key), so clients
 *  can neither forge completion nor point `resumeObjectKey` at an object they do not own. */
export const candidateProfileCreateSchema = z.strictObject({
    headline,
    summary,
    skills: z.array(skillSchema).default([]),
    experience: experienceCreateSchema.optional(),
    education: z.array(educationItemSchema).default([]),
    preferences: preferencesCreateSchema.optional(),
});

export const candidateProfileUpdateSchema = z.strictObject({
    headline,
    summary,
    skills: z.array(skillSchema).optional(),
    experience: experienceUpdateSchema.optional(),
    education: z.array(educationItemSchema).optional(),
    preferences: preferencesUpdateSchema.optional(),
});
