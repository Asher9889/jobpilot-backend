import pino from "pino";


let options = {
    level: process.env.LOG_LEVEL || "info",
    transport: {
        target: "pino-pretty",
        options: {
            colorize: true,
            translateTime: "SYS:standard",
        },
    },
}

const logger = pino(options);

export default logger;