import express from "express";
import authenticate from "../../middlewares/authenticate.ts";
import queryValidate from "../../middlewares/queryValidate.ts";
import paramsValidate from "../../middlewares/paramsValidate.ts";
import { jobMatchingController } from "./job-matching.module.ts";
import { getJobMatchesQuerySchema, jobMatchIdParamSchema } from "./job-matching.schema.ts";

const router = express.Router();

router.get("/", authenticate, queryValidate(getJobMatchesQuerySchema), jobMatchingController.getMatchingJobs);
router.get("/:id", authenticate, paramsValidate(jobMatchIdParamSchema), jobMatchingController.getMatchById);

export default router;
