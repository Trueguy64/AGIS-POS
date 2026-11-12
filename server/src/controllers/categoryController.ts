import type { Request, Response } from "express";
import { prisma } from "../db";
import { categoryCreateSchema, categoryUpdateSchema } from "../schemas/categorySchemas";
import { fail } from "../middlewares/errorHandler";

export async function getAllCategories(_req: Request, res: Response) {
    try {
        res.json(await prisma.category.findMany({ orderBy: { name: "asc" } }));
    } catch (err) {
        fail(res, err);
    }
}

export async function createCategory(req: Request, res: Response) {
    try {
        const result = categoryCreateSchema.safeParse(req.body);
        if (!result.success) { res.status(400).json({ message: "Validation error" }); return; }
        res.status(201).json(await prisma.category.create({ data: result.data }));
    } catch (err) {
        fail(res, err);
    }
}

export async function updateCategory(req: Request, res: Response) {
    try {
        const result = categoryUpdateSchema.safeParse(req.body);
        if (!result.success) { res.status(400).json({ message: "Validation error" }); return; }
        res.json(await prisma.category.update({ where: { id: req.params.id as string }, data: result.data }));
    } catch (err) {
        fail(res, err);
    }
}

export async function deleteCategory(req: Request, res: Response) {
    try {
        const id = req.params.id as string;
        const itemsUsingIt = await prisma.item.count({ where: { categoryId: id } });
        if (itemsUsingIt > 0) {
            res.status(409).json({ message: `Cannot delete: ${itemsUsingIt} item(s) still use this category. Reassign them first.` });
            return;
        }
        await prisma.category.delete({ where: { id } });
        res.json({ message: "Category deleted", id });
    } catch (err) {
        fail(res, err);
    }
}
