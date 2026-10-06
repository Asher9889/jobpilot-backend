import express from "express";
import { envConfig, logger } from "./config/index.ts";
// import "./modules/telegram/login.ts"
import apiRoutes from "./routes/index.ts";

const app = express();


app.use("/api", apiRoutes);

app.listen(envConfig.port, () => {
    logger.info({ port: envConfig.port}, `App is listening`)
})