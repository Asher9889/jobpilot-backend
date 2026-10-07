import express from "express";
import { authController } from "./auth.module.ts";
import { authenticate, schemaValidate } from "../../middlewares/index.ts";
import { loginSchema } from "./auth.schema.ts";

const router = express.Router();

router.post("/login", schemaValidate(loginSchema), authController.login);
router.post("/refresh", authenticate, authController.refresh);
router.get("/me", authenticate, authController.getMe);
router.post("/logout", authController.logout);

export default router;