import UserController from "./user.controller.ts";
import UserService from "./user.service.ts";

const userService = new UserService();
const userController = new UserController(userService);

export { userController, userService };

