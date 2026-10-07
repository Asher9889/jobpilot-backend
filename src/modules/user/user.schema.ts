import z from "zod";
import mongoose from "mongoose";
import { USER_ROLE } from "./user.types.ts";
import { ACCOUNT_STATUS } from "./user.constant.ts";


const createUserSchema = z.object({
  email: z.email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters long" }).max(20, { message: "Password must be at most 20 characters long" }),
  role: z.enum(Object.values(USER_ROLE), { message: `Valid values are: ${Object.values(USER_ROLE).join(", ")}` }),
  accountStatus: z.enum(Object.values(ACCOUNT_STATUS), { message: `Valid values are: ${Object.values(ACCOUNT_STATUS).join(", ")}` }).default(ACCOUNT_STATUS.ACTIVE),
});

const updateAccountStatusSchema = z.object({
  accountStatus: z.enum(Object.values(ACCOUNT_STATUS), { message: `Valid values are: ${Object.values(ACCOUNT_STATUS).join(", ")}` }),
});

const updateUserSchema = z.object({
  email: z.email({ message: "Invalid email address" }).optional(),
  password: z.string().min(6, { message: "Password must be at least 6 characters long" }).max(20, { message: "Password must be at most 20 characters long" }).optional(),
  accountStatus: z.enum(Object.values(ACCOUNT_STATUS), { message: `Valid values are: ${Object.values(ACCOUNT_STATUS).join(", ")}` }).optional(),
}).superRefine((data, ctx) => {
  if (!data.email && !data.password && !data.accountStatus) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "At least one of email, password, or accountStatus is required for update" });
  }
});

const objectIdParamSchema = z.object({
    id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), { message: "Please provide a valid ID" }),
});

const getAllUsersQuerySchema = z.object({
    page: z.coerce.number().min(1, { message: "Page must be at least 1" }).default(1),
    limit: z.coerce.number().min(1, { message: "Limit must be at least 1" }).max(50, { message: "Limit must be at most 50" }).default(20),
    search: z.string().trim().min(1, { message: "Search must not be empty" }).optional(),
    role: z.enum(Object.values(USER_ROLE), { message: `Valid values are: ${Object.values(USER_ROLE).join(", ")}` }).default(USER_ROLE.ADMIN),
    accountStatus: z.enum(Object.values(ACCOUNT_STATUS), { message: `Valid values are: ${Object.values(ACCOUNT_STATUS).join(", ")}` }).optional(),
    sortBy: z.enum(["createdAt", "email"], { message: "Valid values are: createdAt, email" }).default("createdAt"),
    sortOrder: z.enum(["asc", "desc"], { message: "Valid values are: asc, desc" }).default("desc"),
});


export { createUserSchema, updateAccountStatusSchema, updateUserSchema, objectIdParamSchema, getAllUsersQuerySchema };