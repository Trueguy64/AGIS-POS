import { z } from "zod";

export const promoEnterSchema = z.object({
    code: z.string().min(1, "Enter a promo code").trim().toUpperCase(),
})

export const promoRegisterSchema = z.object({
    code: z.string().min(1, "Enter a promo code"),
    discountAmount: z.number(),
    type: z.enum(["VALUE", "PERCENT"]),
})

export type PromoEnterData = z.infer<typeof promoEnterSchema>;
export type PromoRegisterData = z.infer<typeof promoRegisterSchema>;
