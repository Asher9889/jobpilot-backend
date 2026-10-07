import { CookieOptions } from "express";
import AuthController from "./auth.controller.ts";
import AuthService from "./auth.service.ts";

const cookieOptions:CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 1000 * 60 * 60 * 24, // 1 day
};


const authService = new AuthService();
const authController = new AuthController(authService, cookieOptions);

export { authController, authService };