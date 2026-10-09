import { Redis } from "ioredis";
import envConfig from "./envConfig.ts";
import logger from "./logger.ts";


const { host, port, password } = envConfig.redis;
console.log("Redis Config:", { host, port, password: password ? "****": undefined }); // Mask the password in logs for security

const redisConnectionOptions = {
  host: host,
  port: port,
  username: "default",
  password: password,
  db: 0,
  maxRetriesPerRequest: null, // BullMQ handles retries internally. if true redis will interfere with bullmq retry mechanism
  enableReadyCheck: true, // Enable ready check to ensure the connection is established
};

const redis = new Redis(redisConnectionOptions);

redis.on("connect", () => {
  logger.info("✅ Client connected to Redis Server");
});

redis.on("error", (err) => {
  logger.error("❌ Redis Error: " + err);
});


export default redis;
export { redisConnectionOptions };