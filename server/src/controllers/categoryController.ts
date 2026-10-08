import type { Request, Response } from "express";
import { prisma } from "../db";
import { categoryCreateSchema, categoryUpdateSchema } from "../schemas/categorySchemas";

function fail(res: Response, err: unknown) {
    console.error("[categoryController]", err);
    res.status(500).json({ error: "Internal server error" });
}

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
        if (!result.success) {
            res.status(400).json({ message: "Validation error" });
            return;
        }
        if (await prisma.category.findUnique({ where: { name: result.data.name } })) {
            res.status(409).json({ message: "A category with that name already exists" });
            return;
        }
        res.status(201).json(await prisma.category.create({ data: result.data }));
    } catch (err) {
        fail(res, err);
    }
}

export async function updateCategory(req: Request, res: Response) {
    try {
        const id = req.params.id as string;
        const result = categoryUpdateSchema.safeParse(req.body);
        if (!result.success) {
            res.status(400).json({ message: "Validation error" });
            return;
        }
        const { name } = result.data;
        if (name) {
            const conflict = await prisma.category.findUnique({ where: { name } });
            if (conflict && conflict.id !== id) {
                res.status(409).json({ message: "A category with that name already exists" });
                return;
            }
        }
        res.json(await prisma.category.update({ where: { id }, data: result.data }));
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
