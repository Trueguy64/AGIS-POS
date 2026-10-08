import { z } from "zod";

// Multipart bodies arrive as strings, hence z.coerce.
const itemSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  image: z.string().min(1).regex(/\.(jpg|jpeg|png|webp)$/i, "Must be JPG, PNG, or WEBP"),
  description: z.string().max(500).optional(),
  categoryId: z.cuid2().optional(),
  // No zod defaults here: they would also fire on PATCH and reset omitted fields. Prisma supplies @default(0).
  stock: z.coerce.number().int().nonnegative().optional(),
  weight: z.coerce.number().positive("Weight must be greater than 0 grams"),
  purity: z.coerce.number().gt(0).max(1, "Purity is a fraction between 0 and 1, e.g. 0.965"),
  laborFee: z.coerce.number().int().nonnegative().optional(),
});

export const itemRegisterSchema = itemSchema;
export const itemUpdateSchema = itemSchema.partial();
