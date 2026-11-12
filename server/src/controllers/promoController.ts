import type { Request, Response } from "express";
import { prisma } from "../db";
import { promoEnterSchema, promoRegisterSchema } from "../schemas/promoSchemas";
import { fail } from "../middlewares/errorHandler";

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
        if (!entered.success) { res.status(400).json({ message: "Validation error" }); return; }
        const promo = await prisma.promo.findUnique({ where: { code: entered.data.code } });
        if (!promo) { res.status(404).json({ message: "Invalid promo code" }); return; }
        res.json(promo);
    } catch (err) {
        fail(res, err);
    }
}

export async function registerPromo(req: Request, res: Response) {
    try {
        const result = promoRegisterSchema.safeParse(req.body);
        if (!result.success) { res.status(400).json({ message: "Validation error" }); return; }
        res.json(await prisma.promo.create({ data: result.data }));
    } catch (err) {
        fail(res, err);
    }
}

export async function updatePromo(req: Request, res: Response) {
    try {
        const result = promoRegisterSchema.partial().safeParse(req.body);
        if (!result.success) { res.status(400).json({ message: "Validation error" }); return; }
        res.json(await prisma.promo.update({ where: { id: req.params.id as string }, data: result.data }));
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
