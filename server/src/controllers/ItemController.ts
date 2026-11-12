import type { Request, Response } from "express";
import { prisma } from "../db";
import { itemRegisterSchema, itemUpdateSchema } from "../schemas/ItemSchemas";
import type { ItemWhereInput } from "../generated/prisma/models/Item";
import { fail } from "../middlewares/errorHandler";
import fs from "fs/promises";
import path from "path";

// JOIN the Category row under `item.category` so the client never looks names up itself.
const itemWithCategory = { include: { category: true } } as const;

// GET /item/inventory?search=&categories=A,B,none — `hasUncategorized` is computed over the full
// table so the sidebar can offer the "Uncategorized" row even while a filter is active.
export async function getInventory(req: Request, res: Response) {
    try {
        const search = String(req.query.search ?? "").trim();
        const tokens = String(req.query.categories ?? "").split(",").map((s) => s.trim()).filter(Boolean);
        const hasUncategorized = Boolean(await prisma.item.findFirst({ where: { categoryId: null }, select: { id: true } }));

        const and: ItemWhereInput[] = [];
        if (search) and.push({ OR: [{ title: { contains: search } }, { description: { contains: search } }] });
        if (tokens.length) {
            // "none" asks for items with no category; the rest are category names. Names that no
            // longer resolve are dropped silently: a renamed or deleted category just does not match.
            const names = tokens.filter((t) => t !== "none");
            const ids = names.length ? (await prisma.category.findMany({ where: { name: { in: names } }, select: { id: true } })).map((c) => c.id) : [];
            const or: ItemWhereInput[] = [];
            if (tokens.includes("none")) or.push({ categoryId: null });
            if (ids.length) or.push({ categoryId: { in: ids } });
            if (!or.length) { res.json({ items: [], hasUncategorized }); return; }
            and.push({ OR: or });
        }

        const items = await prisma.item.findMany({ ...itemWithCategory, where: and.length ? { AND: and } : undefined });
        res.json({ items, hasUncategorized });
    } catch (err) {
        fail(res, err);
    }
}

export async function registerItem(req: Request, res: Response) {
    try {
        if (!req.file) { res.status(400).json({ message: "Image is required" }); return; }
        const result = itemRegisterSchema.safeParse({ ...req.body, image: `uploads/${req.file.filename}` });
        if (!result.success) {
            await fs.unlink(req.file.path).catch(() => {}); // never leak the rejected upload
            res.status(400).json({ message: "validation error", error: result.error.issues });
            return;
        }
        const { categoryId } = result.data;
        if (categoryId && !(await prisma.category.findUnique({ where: { id: categoryId } }))) {
            res.status(404).json({ message: "Category not found" });
            return;
        }
        res.status(201).json(await prisma.item.create({ data: result.data, ...itemWithCategory }));
    } catch (err) {
        if (req.file) await fs.unlink(req.file.path).catch(() => {}); // e.g. duplicate title
        fail(res, err);
    }
}

async function deleteLocalImage(image: string) {
    if (image.endsWith("placeholder.png")) return; // shared by seeded items
    await fs.unlink(path.join(process.cwd(), image));
}

export async function updateItem(req: Request, res: Response) {
    try {
        const id = req.params.id as string;
        const result = itemUpdateSchema.safeParse(req.body);
        if (!result.success) { res.status(400).json({ message: "Validation error", error: result.error.issues }); return; }
        const { stock, ...updates } = result.data;

        // Conditional stock write FIRST, before any side effect (image delete), so a refused
        // update never deletes the current image file. A reservation claimed in between the read
        // and the write would otherwise leave stock < held.
        if (stock !== undefined) {
            const won = await prisma.item.updateMany({ where: { id, held: { lte: stock } }, data: { stock } });
            if (won.count === 0) {
                const re = await prisma.item.findUnique({ where: { id }, select: { held: true } });
                if (!re) { res.status(404).json({ message: "Item not found" }); return; }
                res.status(409).json({ message: `${re.held} units are held by reservations` });
                return;
            }
        }

        // Snapshot the old image filename; delete it only after the row update commits.
        let oldImage: string | undefined;
        if (updates.image !== undefined) {
            const existing = await prisma.item.findUnique({ where: { id } });
            if (!existing) { res.status(404).json({ message: "Item not found" }); return; }
            oldImage = existing.image ?? undefined;
        }

        if (updates.categoryId && !(await prisma.category.findUnique({ where: { id: updates.categoryId } }))) {
            res.status(404).json({ message: "Category not found" });
            return;
        }

        const updated = Object.keys(updates).length > 0
            ? await prisma.item.update({ where: { id }, data: updates, ...itemWithCategory })
            : await prisma.item.findUnique({ where: { id }, ...itemWithCategory });
        if (!updated) { res.status(404).json({ message: "Item not found" }); return; }

        if (oldImage) await deleteLocalImage(oldImage).catch((err) => console.error("Failed to delete old image:", err));
        res.json(updated);
    } catch (err) {
        fail(res, err);
    }
}

export async function deleteItem(req: Request, res: Response) {
    try {
        const id = req.params.id as string;

        // Early fast-path checks (the conditional delete below is the race backstop).
        const existing = await prisma.item.findUnique({ where: { id } });
        if (!existing) { res.status(404).json({ message: "Item not found" }); return; }
        if (existing.held > 0) { res.status(409).json({ message: `${existing.held} units are held by reservations` }); return; }
        if (await prisma.reservation.count({ where: { itemId: id } })) {
            res.status(409).json({ message: "This piece has reservation history; set its stock to 0 instead of deleting" });
            return;
        }

        // Conditional delete: refuses if a reservation was claimed (held > 0) or created
        // (history appeared) in between the checks above. 404 if the row was deleted entirely.
        const won = await prisma.item.deleteMany({ where: { id, held: 0, reservations: { none: {} } } });
        if (won.count === 0) {
            const re = await prisma.item.findUnique({ where: { id } });
            if (!re) { res.status(404).json({ message: "Item not found" }); return; }
            res.status(409).json({ message: re.held > 0
                ? `${re.held} units are held by reservations`
                : "This piece has reservation history; set its stock to 0 instead of deleting" });
            return;
        }

        if (existing.image) await deleteLocalImage(existing.image).catch((err) => console.error("Failed to delete image:", err));
        res.status(200).json(existing);
    } catch (err) {
        fail(res, err);
    }
}
