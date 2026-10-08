import express from "express";
import { telegramRoutes } from "../../modules/telegram/index.ts";
import { authRoutes } from "../../modules/auth/index.ts"
import { userRoutes } from "../../modules/user/index.ts"
import { jobSourceRoutes } from "../../modules/job-source/index.ts"

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/user", userRoutes);
router.use("/telegram", telegramRoutes);
router.use("/job-sources", jobSourceRoutes);

export default router;