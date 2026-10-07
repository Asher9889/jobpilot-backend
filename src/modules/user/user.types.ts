import { USER_ROLE, ACCOUNT_STATUS } from "./user.constant.ts";
import { createUserSchema, updateAccountStatusSchema, updateUserSchema, getAllUsersQuerySchema } from "./user.schema.ts";
import z from "zod";

type TUserRole = typeof USER_ROLE[keyof typeof USER_ROLE];
type TAccountStatus = typeof ACCOUNT_STATUS[keyof typeof ACCOUNT_STATUS];

type TCreateUserPayload = z.infer<typeof createUserSchema>;
type TUpdateAccountStatusPayload = z.infer<typeof updateAccountStatusSchema>;
type TUpdateUserPayload = z.infer<typeof updateUserSchema>;
type TGetAllUsersQuery = z.infer<typeof getAllUsersQuerySchema>;

export type { TUserRole, TAccountStatus, TCreateUserPayload, TUpdateAccountStatusPayload, TUpdateUserPayload, TGetAllUsersQuery };
export { USER_ROLE };