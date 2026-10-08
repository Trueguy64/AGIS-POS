import { z } from "zod";

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(50),
  symbol: z.string().trim().min(1, "Symbol is required").max(4), // a single emoji can be up to 4 UTF-16 units
});

export const categoryUpdateSchema = categoryCreateSchema.partial();
