import express from "express";
import { userController } from "./user.module.ts"
import { authenticate } from "../../middlewares/index.ts";
import { USER_ROLE } from "./user.types.ts";
import { createUserSchema, updateAccountStatusSchema, updateUserSchema, objectIdParamSchema, getAllUsersQuerySchema } from "./user.schema.ts";
import { schemaValidate, paramsValidate, queryValidate, authorize } from "../../middlewares/index.ts";

const router = express.Router();

const { SUPER_ADMIN } = USER_ROLE;

router.get("/", authenticate, authorize(SUPER_ADMIN), queryValidate(getAllUsersQuerySchema), userController.getAllUsers);
router.post("/", authenticate, authorize(SUPER_ADMIN), schemaValidate(createUserSchema), userController.createUser);
router.patch("/:id", authenticate, authorize(SUPER_ADMIN), paramsValidate(objectIdParamSchema), schemaValidate(updateUserSchema), userController.updateUser);
router.patch("/:id/status", authenticate, authorize(SUPER_ADMIN), paramsValidate(objectIdParamSchema), schemaValidate(updateAccountStatusSchema), userController.updateAccountStatus);

export default router;