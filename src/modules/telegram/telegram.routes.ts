import express from "express";
import { telegramController } from "./telegram.module.ts";

const router = express.Router();


router.get("/auth/qr", telegramController.startQrAuth);

export default router;