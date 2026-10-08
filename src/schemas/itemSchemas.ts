import { z } from "zod";

export const itemRegisterSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  categoryId: z.string().optional(),
  stock: z.number().int().nonnegative("Stock cannot be negative").default(0),
  weight: z.number().positive("Weight must be greater than 0"),
  purity: z.number().gt(0).max(1, "Purity must be between 0 and 1"),
  laborFee: z.number().int().nonnegative("Labor fee cannot be negative").default(0),
});

export const itemUpdateSchema = itemRegisterSchema.partial();

export type ItemRegisterInput = z.infer<typeof itemRegisterSchema>;
export type ItemUpdateInput = z.infer<typeof itemUpdateSchema>;
