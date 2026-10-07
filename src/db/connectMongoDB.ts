import mongoose from "mongoose";
import { envConfig, logger } from "../config/index.ts";


async function connectMongoDB(): Promise<void> {
    try {
        const uri = envConfig.mongodbConnectionString;
        await mongoose.connect(uri);
    } catch (error) {
        logger.error("Error connecting to MongoDB: "+ error);
    }
}

export default connectMongoDB;

mongoose.connection.on('connected', () => logger.info(`DB connected ${mongoose.connection.name}`));
mongoose.connection.on('disconnected', () => logger.info(`DB disconnected ${mongoose.connection.name}`));
mongoose.connection.on('reconnected', () => logger.info(`DB reconnected ${mongoose.connection.name}`));
mongoose.connection.on('disconnecting', () => logger.info(`DB disconnecting ${mongoose.connection.name}`));
mongoose.connection.on('close', () => logger.info(`DB close ${mongoose.connection.name}`));


process.on("SIGINT", async () => {
    await mongoose.connection.close();
    logger.info("MongoDB connection closed due to app termination");
    process.exit(0);
})