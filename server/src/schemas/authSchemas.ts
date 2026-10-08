import { z } from "zod";

const cleanPhoneSchema = z.string()
  .transform(val => val.replace(/[\s-]/g, ''))
  .pipe(z.string().regex(/^\d{10,15}$/, "Invalid phone number"));

export const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.email("Invalid email"),
  phone: cleanPhoneSchema,
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["Manager", "Employee"]),
});

export const loginSchema = z.object({
  email: z.email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

export const updateSchema = z.object({
  name: z.string().min(1, "Name is required."),
  email: z.email("Invalid email"),
  phone: cleanPhoneSchema,
})