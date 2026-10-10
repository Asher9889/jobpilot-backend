import { globalErrorHandler, routeNotExistsHandler } from "./utils/index.ts";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectMongoDB } from "./db/index.ts"
import { envConfig, logger } from "./config/index.ts";
import apiRoutes from "./routes/index.ts";
import { httpLogger } from "./middlewares/index.ts";
import { telegramListenerService } from "./modules/telegram/telegram.module.ts";
import { jobMatchingEventListener } from "./modules/job-matching/index.ts";

const app = express();

connectMongoDB().then(() => telegramListenerService.restoreListeners())
    .catch((err) => logger.error({ err }, "Failed to restore Telegram listeners"));;

const allowedOrigins = ["http://127.0.0.1:3000", "http://127.0.0.1:3001", "http://localhost:3000" ]; 

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) {
      return callback(null, true);
    }
    logger.info(`Incoming request from origin: ${origin}`);
    if (allowedOrigins.includes(origin)) {
      return callback(null, origin); // echo the origin
    }
    logger.error(`Blocked request from origin: ${origin}`);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true
}));

// listen listen for events
telegramListenerService.register();
jobMatchingEventListener.register();

// app.use(httpLogger);
app.use(express.json());
app.use(cookieParser())



app.use("/api", apiRoutes);

app.use(routeNotExistsHandler);
app.use(globalErrorHandler);

app.listen(envConfig.port, () => {
    logger.info({ port: envConfig.port}, `App is listening`)
})