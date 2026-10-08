import express from "express";
import authenticate from "../../middlewares/authenticate.ts";
import { jobSourceController } from "./job-source.module.ts";
import schemaValidate from "../../middlewares/schemaValidate.ts";
import { createJobSourceRequestSchema } from "./job-source.schema.ts";

const router = express.Router();


router.post("/", authenticate, schemaValidate(createJobSourceRequestSchema), jobSourceController.addJobSource);
 
export default router;