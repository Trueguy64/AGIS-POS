import { z } from "zod";

export const promoEnterSchema = z.object({
  code: z.string().min(1, "Enter a promo code"),
})

export const promoRegisterSchema = z.object({
  code: z.string().min(1, "Enter a promo code").trim().toUpperCase(),
  discountAmount: z.number(),
  type: z.enum(["VALUE", "PERCENT"]),
})