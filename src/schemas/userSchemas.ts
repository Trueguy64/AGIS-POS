import { z } from "zod";

const cleanPhoneSchema = z.string()
  .transform(val => val.replace(/[\s-]/g, ''))
  .pipe(z.string().regex(/^\d{10,15}$/, "Invalid phone number"));

export const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.email("Invalid email"),
  phone: cleanPhoneSchema,
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["Manager", "Employee"], "Select a role"),
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

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type updateFormData = z.infer<typeof updateSchema>;

/** First validation message per field, for inline form errors. */
export const fieldErrors = (error: z.ZodError): Record<string, string | undefined> =>
  Object.fromEntries(Object.entries(z.flattenError(error).fieldErrors).map(([k, v]) => [k, (v as string[] | undefined)?.[0]]));
