import { ACCOUNT_STATUS, UserModel, USER_ROLE} from "../modules/user/index.ts";
import { envConfig, logger } from "../config/index.ts";
import connectMongoDB from "../db/connectMongoDB.ts";

async function seedSuperAdmin(): Promise<void> {
    await connectMongoDB();

    const { email, password } = envConfig.superAdmin;

    const existingUser = await UserModel.findOne({ email });

    if (existingUser) {
        logger.info("Super admin already exists");
        process.exit(0);
    }

    await UserModel.create({
        email,
        password,
        role: USER_ROLE.USER,
        accountStatus: ACCOUNT_STATUS.ACTIVE,
    });

    logger.info("Super admin seeded successfully");
    process.exit(0);
}

seedSuperAdmin().catch((error) => {
    logger.error("Error seeding super admin: " + error);
    process.exit(1);
});