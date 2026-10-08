import type { Request, Response } from "express";
import { prisma } from "../db";
import { promoEnterSchema, promoRegisterSchema } from "../schemas/promoSchemas";

function fail(res: Response, err: unknown) {
    console.error("[promoController]", err);
    res.status(500).json({ error: "Internal server error" });
}

export async function getAllPromo(_req: Request, res: Response) {
    try {
        res.json(await prisma.promo.findMany());
    } catch (err) {
        fail(res, err);
    }
}

export async function getPromo(req: Request, res: Response) {
    try {
        const entered = promoEnterSchema.safeParse(req.body);
        if (!entered.success) {
            res.status(400).json({ message: "Validation error" });
            return;
        }
        const promo = await prisma.promo.findUnique({ where: { code: entered.data.code } });
        if (!promo) {
            res.status(404).json({ message: "Invalid promo code" });
            return;
        }
        res.json(promo);
    } catch (err) {
        fail(res, err);
    }
}

export async function registerPromo(req: Request, res: Response) {
    try {
        const result = promoRegisterSchema.safeParse(req.body);
        if (!result.success) {
            res.status(400).json({ message: "Validation error" });
            return;
        }
        if (await prisma.promo.findUnique({ where: { code: result.data.code } })) {
            res.status(409).json({ message: "Promo code already exists!" });
            return;
        }
        res.json(await prisma.promo.create({ data: result.data }));
    } catch (err) {
        fail(res, err);
    }
}

export async function updatePromo(req: Request, res: Response) {
    try {
        const id = req.params.id as string;
        const { code, discountAmount, type } = req.body;
        const updates: Record<string, unknown> = {};
        if (code) updates.code = code;
        if (discountAmount) updates.discountAmount = discountAmount;
        if (type) updates.type = type;

        if (code) {
            const conflict = await prisma.promo.findUnique({ where: { code } });
            if (conflict && conflict.id !== id) {
                res.status(409).json({ message: "Promo code is already in use" });
                return;
            }
        }
        res.json(await prisma.promo.update({ where: { id }, data: updates }));
    } catch (err) {
        fail(res, err);
    }
}

export async function deletePromo(req: Request, res: Response) {
    try {
        res.json(await prisma.promo.delete({ where: { id: req.params.id as string } }));
    } catch (err) {
        fail(res, err);
    }
}
