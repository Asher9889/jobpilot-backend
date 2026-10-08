import express from "express";
import { telegramController } from "./telegram.module.ts";
import { authenticate } from "../../middlewares/index.ts";

const router = express.Router();

router.get("/auth/qr", authenticate, telegramController.startQrAuth);
router.get("/sources/available", authenticate, telegramController.getAvailableSources);
 
export default router;