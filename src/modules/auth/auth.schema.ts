import z from "zod";

const loginSchema = z.object({
  email: z.email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters long" }).max(20, { message: "Password must be at most 20 characters long" }),
});

export  { loginSchema };