import express from "express";
import authenticate from "../../middlewares/authenticate.ts";
import queryValidate from "../../middlewares/queryValidate.ts";
import { jobSourceController } from "./job-source.module.ts";
import schemaValidate from "../../middlewares/schemaValidate.ts";
import { createJobSourceRequestSchema, getJobSourcesQuerySchema } from "./job-source.schema.ts";

const router = express.Router();


router.post("/", authenticate, schemaValidate(createJobSourceRequestSchema), jobSourceController.addJobSource);
router.get("/", authenticate, queryValidate(getJobSourcesQuerySchema), jobSourceController.getJobSources);
 
export default router;