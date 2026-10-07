import express from "express";
import cors from "cors";
import { connectMongoDB } from "./db/index.ts"
import { envConfig, logger } from "./config/index.ts";
import apiRoutes from "./routes/index.ts";
import { httpLogger } from "./middlewares/index.ts";


const app = express();

connectMongoDB();


const allowedOrigins = ["http://localhost:3001" ]; 

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

app.use(httpLogger);

app.use("/api", apiRoutes);

app.listen(envConfig.port, () => {
    logger.info({ port: envConfig.port}, `App is listening`)
})