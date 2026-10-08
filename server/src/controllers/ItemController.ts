import type { Request, Response } from "express";
import { prisma } from "../db";
import { itemRegisterSchema, itemUpdateSchema } from "../schemas/ItemSchemas";
import type { ItemModel, ItemWhereInput } from "../generated/prisma/models/Item";
import fs from "fs/promises";
import path from "path";

// `include: { category: true }` tells Prisma to JOIN the Category table and
// nest the full row under `item.category`. Without it the response would only
// carry `categoryId` and the frontend would have to look up the name itself.
const itemWithCategory = { include: { category: true } } as const;

// Response shape for GET /item/inventory. `hasUncategorized` is computed over the full
// table so the cashier's sidebar can offer the "Uncategorized" row even when a filter
// is active. `items` honours the active filter, if any.
type InventoryResponse = { items: ItemModel[]; hasUncategorized: boolean };

export async function getInventory(req: Request, res: Response) {
    try {
        const search = String(req.query.search ?? "").trim();
        const categoriesParam = String(req.query.categories ?? "").trim();
        const tokens = categoriesParam ? categoriesParam.split(",").map((s) => s.trim()).filter(Boolean) : [];

        // Resolve category names to ids in one query. The "none" token is the
        // cashier's way of asking for items with no category — kept as a string
        // so the URL is readable and the schema never sees a fake id.
        const wantsUncategorized = tokens.includes("none");
        const nameTokens = tokens.filter((t) => t !== "none");
        const matchedCategories = nameTokens.length
            ? await prisma.category.findMany({ where: { name: { in: nameTokens } }, select: { id: true } })
            : [];
        const matchedIds = matchedCategories.map((c) => c.id);

        // Build the WHERE for the items query. nameTokens means "match by name",
        // so the cashier can ask for an "Uncategorized" + named-category union
        // without learning the underlying ids. Token names that didn't resolve
        // to a real category are dropped silently: a renamed or deleted category
        // just doesn't match, instead of erroring.
        const andClauses: ItemWhereInput[] = [];
        if (search) {
            andClauses.push({
                OR: [
                    { title: { contains: search } },
                    { description: { contains: search } },
                ],
            });
        }
        if (tokens.length > 0) {
            const orArms: ItemWhereInput[] = [];
            if (wantsUncategorized) orArms.push({ categoryId: null });
            if (matchedIds.length > 0) orArms.push({ categoryId: { in: matchedIds } });
            andClauses.push(orArms.length > 0 ? { OR: orArms } : { id: { equals: "__no_match__" } });
        }

        const where = andClauses.length > 0 ? { AND: andClauses } : undefined;
        const items = await prisma.item.findMany({ ...itemWithCategory, where });

        // hasUncategorized is independent of the filter: the sidebar needs it to decide
        // whether to show the "Uncategorized" row at all.
        const hasUncategorized = await prisma.item.findFirst({ where: { categoryId: null }, select: { id: true } });

        const body: InventoryResponse = { items, hasUncategorized: Boolean(hasUncategorized) };
        res.json(body);
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

        // Conditional stock write FIRST — before any side effect (image delete), so a refused
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

        const updates: Record<string, unknown> = {};
        if (title !== undefined) updates.title = title;
        if (image !== undefined) updates.image = image;
        if (description !== undefined) updates.description = description;
        if (categoryId !== undefined) updates.categoryId = categoryId;
        if (weight !== undefined) updates.weight = weight;
        if (purity !== undefined) updates.purity = purity;
        if (laborFee !== undefined) updates.laborFee = laborFee;

        // Snapshot the old image filename, but don't delete the file yet — only after the row
        // update below commits. That way a refused update never deletes the current image.
        let oldImage: string | undefined;
        if (image !== undefined) {
            const existing = await prisma.item.findUnique({ where: { id } });
            if (!existing) {
                res.status(404).json({ message: "Item not found" });
                return;
            }
            oldImage = existing.image ?? undefined;
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

        // Apply remaining updates. Stock was already written conditionally above; the other
        // fields don't depend on held, so a regular update is fine.
        let updated;
        if (Object.keys(updates).length > 0) {
            updated = await prisma.item.update({ where: { id }, data: updates, ...itemWithCategory });
        } else {
            updated = await prisma.item.findUnique({ where: { id }, ...itemWithCategory });
        }
        if (!updated) { res.status(404).json({ message: "Item not found" }); return; }

        if (oldImage) {
            await deleteLocalImage(oldImage).catch((err) => {
                console.error("Failed to delete old image:", err);
            });
        }

        res.json(updated);
    } catch {
        res.status(500).json({ error: "Internal server error" });
    }
}
export async function deleteItem(req: Request, res: Response) {
    try {
        const id = req.params.id as string;

        // Early fast-path checks (the conditional delete below is the race backstop).
        const existing = await prisma.item.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({ message: "Item not found" });
            return;
        }

        if (existing.held > 0) {
            res.status(409).json({ message: `${existing.held} units are held by reservations` });
            return;
        }
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

        // Only after the conditional delete succeeded: drop the local image file.
        if (existing.image) {
            await deleteLocalImage(existing.image).catch((err) => {
                console.error("Failed to delete image:", err);
            });
        }

        res.status(200).json(existing);
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
        // Fast path: obvious refusal before the conditional write.
        if (newStock < item.held) {
            res.status(409).json({ message: `${item.held} units are held by reservations` });
            return;
        }

        // Conditional write: refuses if a reservation claimed in between the read above and the write.
        const won = await prisma.item.updateMany({ where: { id, held: { lte: newStock } }, data: { stock: newStock } });
        if (won.count === 0) {
            const re = await prisma.item.findUnique({ where: { id } });
            if (!re) { res.status(404).json({ message: "Item not found" }); return; }
            res.status(409).json({ message: `${re.held} units are held by reservations` });
            return;
        }

        const updatedItem = await prisma.item.findUnique({ where: { id }, ...itemWithCategory });
        res.status(200).json(updatedItem);
    } catch {
        res.status(500).json({ error: "Internal server error" });
    }
}
