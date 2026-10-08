import type { Request, Response } from "express";
import { prisma } from "../db";
import { itemRegisterSchema, itemUpdateSchema } from "../schemas/ItemSchemas";
import fs from "fs/promises";
import path from "path";

// `include: { category: true }` tells Prisma to JOIN the Category table and
// nest the full row under `item.category`. Without it the response would only
// carry `categoryId` and the frontend would have to look up the name itself.
const itemWithCategory = { include: { category: true } } as const;

export async function getInventory(_req: Request, res: Response) {
    try {
        const items = await prisma.item.findMany(itemWithCategory);
        res.json(items);
    } catch {
        res.status(500).json({ error: "Internal server error" });
    }
}

export async function getItem(req: Request, res: Response) {
    try {
        const id = req.params.id as string;
        const item = await prisma.item.findUnique({ where: { id }, ...itemWithCategory });

        if (!item) {
            res.status(404).json({ message: "Item not found" });
            return;
        }

        res.json(item);
    } catch {
        res.status(500).json({ error: "Internal server error" });
    }
}

export async function registerItem(req: Request, res: Response) {
    try {
        if (!req.file) {
            res.status(400).json({ message: "Image is required" });
            return;
        }

        const imageUrl = `uploads/${req.file.filename}`;
        const result = itemRegisterSchema.safeParse({ ...req.body, image: imageUrl });

        if (!result.success) {
            await fs.unlink(req.file.path).catch(() => {}); // don't leak the rejected upload
            res.status(400).json({ message: `validation error`, error: result.error.issues});
            return;
        }

        const { title, image, description, categoryId, stock, weight, purity, laborFee } = result.data;

        // Verify the category actually exists. Without this Prisma still errors
        // on the FK constraint, but we get a cleaner 404 here.
        if (categoryId) {
            const cat = await prisma.category.findUnique({ where: { id: categoryId } });
            if (!cat) {
                res.status(404).json({ message: "Category not found" });
                return;
            }
        }

        const existing = await prisma.item.findFirst({ where: { title } });
        if (existing) {
            res.status(409).json({ message: "Item already exists!" });
            return;
        }

        const item = await prisma.item.create({
            data: { title, image, description, categoryId, stock, weight, purity, laborFee },
            ...itemWithCategory,
        });

        res.status(201).json(item);
    } catch {
        res.status(500).json({ error: "Internal server error" });
    }
}

export async function deleteLocalImage(imageUrl: string): Promise<void> {
    if (imageUrl.endsWith("placeholder.png")) return; // shared by seeded items
    const relativePath = imageUrl.replace("http://localhost:3000/", "");
    const absolutePath = path.join(process.cwd(), relativePath);
    await fs.unlink(absolutePath);
}

export async function updateItem(req: Request, res: Response) {
    try {
        const id = req.params.id as string;
        const result = itemUpdateSchema.safeParse(req.body);

        if (!result.success) {
            res.status(400).json({ message: "Validation error", error: result.error.issues});
            return;
        }

        const { title, image, description, categoryId, stock, weight, purity, laborFee } = result.data;
        const updates: Record<string, unknown> = {};

        // Only forward fields the client actually sent. `?? undefined` would
        // overwrite with null on omitted fields; we want PATCH semantics.
        if (title !== undefined) updates.title = title;
        if (image !== undefined) updates.image = image;
        if (description !== undefined) updates.description = description;
        if (categoryId !== undefined) updates.categoryId = categoryId;
        if (stock !== undefined) updates.stock = stock;
        if (weight !== undefined) updates.weight = weight;
        if (purity !== undefined) updates.purity = purity;
        if (laborFee !== undefined) updates.laborFee = laborFee;

        if (image !== undefined) {
            const existing = await prisma.item.findUnique({ where: { id } });
            if (!existing) {
                res.status(404).json({ message: "Item not found" });
                return;
            }
            if (existing.image) {
                await deleteLocalImage(existing.image).catch((err) => {
                    console.error("Failed to delete old image:", err);
                });
            }
            updates.image = image;
        }

        if (title) {
            const conflict = await prisma.item.findFirst({ where: { title, NOT: { id } } });
            if (conflict) {
                res.status(409).json({ message: "An item with this title already exists" });
                return;
            }
        }

        if (categoryId) {
            const cat = await prisma.category.findUnique({ where: { id: categoryId } });
            if (!cat) {
                res.status(404).json({ message: "Category not found" });
                return;
            }
        }

        const updated = await prisma.item.update({
            where: { id },
            data: updates,
            ...itemWithCategory,
        });

        res.json(updated);
    } catch {
        res.status(500).json({ error: "Internal server error" });
    }
}
export async function deleteItem(req: Request, res: Response) {
    try {
        const id = req.params.id as string;

        const existing = await prisma.item.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({ message: "Item not found" });
            return;
        }

        if (existing.image) {
            await deleteLocalImage(existing.image).catch((err) => {
                console.error("Failed to delete image:", err);
            });
        }

        const deletedItem = await prisma.item.delete({ where: { id } });
        res.status(200).json(deletedItem);
    } catch {
        res.status(500).json({ error: "Internal server error" });
    }
}

export async function adjustStock(req: Request, res: Response) {
    try {
        const id = req.params.id as string;
        const { quantity } = req.body;

        if (typeof quantity !== "number" || !Number.isInteger(quantity)) {
            res.status(400).json({ message: "Quantity must be an integer" });
            return;
        }

        const item = await prisma.item.findUnique({ where: { id } });
        if (!item) {
            res.status(404).json({ error: "Item not found" });
            return;
        }

        const newStock = item.stock + quantity;
        if (newStock < 0) {
            res.status(400).json({ message: "Insufficient stock" });
            return;
        }

        const updatedItem = await prisma.item.update({
            where: { id },
            data: { stock: newStock },
            ...itemWithCategory,
        });

        res.status(200).json(updatedItem);
    } catch {
        res.status(500).json({ error: "Internal server error" });
    }
}
