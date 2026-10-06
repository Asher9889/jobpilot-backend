const envConfig = {
    port: process.env.PORT,

    telegram: {
        apiId: Number(process.env.TELEGRAM_API_ID)!,
        apiHash: process.env.TELEGRAM_API_HASH!
    }

}

export default envConfig;