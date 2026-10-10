import { z } from "zod";

export const extractedJobSchema = z.object({

  company: z.string().nullable(),

  roles: z.array(z.string()),

  experience: z.object({
    minYears: z.number().nullable(),
    maxYears: z.number().nullable(),
  }),

  location: z.object({
    city: z.string().nullable(),
    state: z.string().nullable(),
    country: z.string().nullable(),
  }),

  skills: z.array(z.string()),

  application: z.object({
    email: z.string().nullable(),
    phone: z.string().nullable(),
    applyUrl: z.string().nullable(),
    companyWebsite: z.string().nullable(),
  }),
});


