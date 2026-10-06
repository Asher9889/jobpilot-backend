import express from "express";
import { telegramRoutes } from "../../modules/telegram/index.ts";


const router = express.Router();

// router.use("/auth", authRoutes);
router.use("/telegram", telegramRoutes);

export default router;