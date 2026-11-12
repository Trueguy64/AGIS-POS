import { Router } from "express";
import { z } from "zod";
import { Prisma } from "../generated/prisma/client";
import { prisma } from "../db";
import { authenticate } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";
import { salesPdf, bangkokDate } from "../lib/salesPdf";
import { unitPrice } from "../lib/pricing";
import { getReservations } from "../reservations";

const saleSchema = z.object({
  payment: z.enum(["Cash", "PromptPay"]),
  amountPaid: z.number().int().nonnegative(),
  goldRate: z.number().positive(),
  lockedAt: z.string().datetime(),
  promoCodes: z.array(z.string().trim().toUpperCase()).default([]),
  lines: z.array(z.object({ itemId: z.string(), quantity: z.number().int().positive() })).min(1),
});

/** Idempotency-Key validation: non-empty, trimmed, reasonable length so a mistyped huge value
 *  can't blow up an index lookup. A failed validation just falls through and creates normally. */
const idempotencyKey = (headerValue: string | undefined) => {
  if (typeof headerValue !== "string") return null;
  const trimmed = headerValue.trim();
  return trimmed.length > 0 && trimmed.length <= 200 ? trimmed : null;
};

const router = Router();

// POST /api/sale — record a sale and decrement stock atomically. The server recomputes every amount
// from the locked rate and the current catalog; the client's totals are never trusted.
// If the request carries an `Idempotency-Key` header that matches an existing sale, the existing
// sale is returned (same status code and body) so a retried submit does not double-charge the customer.
router.post("/", authenticate, async (req, res) => {
  const parsed = saleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Validation error", error: parsed.error.issues });
    return;
  }
  const { payment, amountPaid, goldRate, lockedAt, promoCodes, lines } = parsed.data;
  const key = idempotencyKey(req.header("Idempotency-Key"));

  // Cheapest path first: did a previous request with this key already commit?
  if (key) {
    const existing = await prisma.sale.findUnique({ where: { saleKey: key }, include: { lines: true } });
    if (existing) {
      res.status(201).json(existing);
      return;
    }
  }

  await getReservations().releaseExpired();

  try {
    const sale = await prisma.$transaction(async (tx) => {
      const items = await tx.item.findMany({ where: { id: { in: lines.map((l) => l.itemId) } } });
      const byId = new Map(items.map((i) => [i.id, i]));

      const saleLines = lines.map((l) => {
        const item = byId.get(l.itemId);
        if (!item) throw Object.assign(new Error(`Item ${l.itemId} no longer exists`), { status: 409 });
        if (item.stock - item.held < l.quantity) throw Object.assign(new Error(`Only ${Math.max(0, item.stock - item.held)} of "${item.title}" available (others are reserved)`), { status: 409 });
        return {
          itemId: item.id, title: item.title, weight: item.weight, purity: item.purity, laborFee: item.laborFee,
          unitPrice: unitPrice(item.weight, item.purity, item.laborFee, goldRate), quantity: l.quantity,
        };
      });

      const subtotal = saleLines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
      const promos = promoCodes.length ? await tx.promo.findMany({ where: { code: { in: promoCodes } } }) : [];
      const discount = Math.min(subtotal, Math.round(promos.reduce((s, p) =>
        s + (p.type === "PERCENT" ? subtotal * (p.discountAmount / 100) : p.discountAmount), 0)));
      const total = subtotal - discount;
      if (amountPaid < total) throw Object.assign(new Error("Amount paid is less than the total"), { status: 400 });

      for (const l of saleLines) {
        await tx.item.update({ where: { id: l.itemId }, data: { stock: { decrement: l.quantity } } });
      }

      const cashier = await tx.user.findUnique({ where: { id: req.user!.id } });

      // saleKey is the optional unique column; absent retries still get a row.
      return tx.sale.create({
        data: {
          cashierId: req.user!.id,
          cashierName: cashier?.name ?? req.user!.email,
          payment, amountPaid, change: amountPaid - total, goldRate, lockedAt: new Date(lockedAt),
          subtotal, discount, total, promoCodes: promos.map((p) => p.code).join(","),
          saleKey: key,
          lines: { create: saleLines },
        },
        include: { lines: true },
      });
    });
    res.status(201).json(sale);
  } catch (err) {
    // Race: two identical requests arrived between our pre-check and the create; the unique
    // constraint on saleKey rejects the loser and we re-read the winner.
    if (key && err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const existing = await prisma.sale.findUnique({ where: { saleKey: key }, include: { lines: true } });
      if (existing) {
        res.status(201).json(existing);
        return;
      }
    }
    const status = (err as { status?: number }).status ?? 500;
    if (status === 500) console.error("[sale]", err);
    res.status(status).json({ message: status === 500 ? "Internal server error" : (err as Error).message });
  }
});

// GET /api/sale/:id — the saved sale, for the thank-you screen and the printed slip.
const collectSchema = z.object({ reservationId: z.string().min(1), payment: z.enum(["Cash", "PromptPay"]), amountPaid: z.number().int().nonnegative() });

// POST /api/sale/collect — balance for a PAID reservation. Price, rate and item come from the reservation's quote.
router.post("/collect", authenticate, async (req, res) => {
  const parsed = collectSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: "Validation error", error: parsed.error.issues }); return; }
  const { reservationId, payment, amountPaid } = parsed.data;
  const key = `res-${reservationId}`;
  const replay = () => prisma.sale.findUnique({ where: { saleKey: key }, include: { lines: true } });

  const existing = await replay();
  if (existing) { res.status(201).json(existing); return; }
  await getReservations().releaseExpired();

  try {
    const sale = await prisma.$transaction(async (tx) => {
      const r = await tx.reservation.findUnique({ where: { id: reservationId }, include: { quote: true, item: true } });
      if (!r) throw Object.assign(new Error("Reservation not found"), { status: 404 });
      if (r.status !== "PAID" || r.heldUntil <= new Date()) throw Object.assign(new Error(`Reservation is ${r.status === "PAID" ? "past its hold" : r.status}; ring it up as a normal sale`), { status: 409 });
      const subtotal = r.quote.priceSatang / 100, depositPaid = r.quote.depositSatang / 100, total = subtotal - depositPaid;
      if (amountPaid < total) throw Object.assign(new Error("Amount paid is less than the balance"), { status: 400 });

      const won = await tx.reservation.updateMany({ where: { id: r.id, status: "PAID" }, data: { status: "COLLECTED" } });
      if (won.count !== 1) throw Object.assign(new Error("Already collected"), { status: 409, conflict: true }); // zero-row rule
      await tx.item.update({ where: { id: r.itemId }, data: { stock: { decrement: 1 }, held: { decrement: 1 } } });
      const cashier = await tx.user.findUnique({ where: { id: req.user!.id } });
      const created = await tx.sale.create({
        data: {
          cashierId: req.user!.id, cashierName: cashier?.name ?? req.user!.email, payment, amountPaid, change: amountPaid - total,
          goldRate: r.quote.goldRate, lockedAt: r.quote.createdAt, subtotal, discount: 0, depositPaid, total, promoCodes: "", saleKey: key,
          lines: { create: [{ itemId: r.itemId, title: r.item.title, weight: r.item.weight, purity: r.item.purity, laborFee: r.item.laborFee, unitPrice: subtotal, quantity: 1 }] },
        },
        include: { lines: true },
      });
      await tx.reservation.update({ where: { id: r.id }, data: { saleId: created.id } });
      return created;
    });
    res.status(201).json(sale);
  } catch (err) {
    const again = await replay(); // a concurrent collection won (unique saleKey or the conditional update)
    if (again) { res.status(201).json(again); return; }
    const status = (err as { status?: number }).status ?? 500;
    if (status === 500) console.error("[collect]", err);
    res.status(status).json({ message: status === 500 ? "Internal server error" : (err as Error).message });
  }
});

const rangeSchema = z.object({ from: z.string().datetime(), to: z.string().datetime() })
  .refine((r) => new Date(r.from) < new Date(r.to), "from must be before to");

/** Sales in [from, to), newest first, with totals. Shared by the on-screen list and the PDF. */
async function salesReport(query: unknown) {
  const parsed = rangeSchema.safeParse(query);
  if (!parsed.success) return null;
  const from = new Date(parsed.data.from), to = new Date(parsed.data.to);
  const rows = await prisma.sale.findMany({
    where: { createdAt: { gte: from, lt: to } },
    orderBy: { createdAt: "desc" },
    include: { lines: { select: { quantity: true } } },
  });
  const sales = rows.map((s) => ({
    id: s.id, createdAt: s.createdAt, cashierName: s.cashierName, payment: s.payment,
    pieces: s.lines.reduce((n, l) => n + l.quantity, 0),
    subtotal: s.subtotal, discount: s.discount, depositPaid: s.depositPaid, total: s.total,
  }));
  const sum = (f: (s: (typeof sales)[number]) => number) => sales.reduce((n, s) => n + f(s), 0);
  const summary = {
    count: sales.length, pieces: sum((s) => s.pieces), subtotal: sum((s) => s.subtotal), discount: sum((s) => s.discount),
    depositPaid: sum((s) => s.depositPaid), total: sum((s) => s.total),
    cash: sum((s) => (s.payment === "Cash" ? s.total : 0)), promptPay: sum((s) => (s.payment === "PromptPay" ? s.total : 0)),
  };
  return { from, to, sales, summary };
}

// GET /api/sale?from=ISO&to=ISO — any signed-in staff may view sales.
router.get("/", authenticate, async (req, res) => {
  const report = await salesReport(req.query);
  if (!report) { res.status(400).json({ message: "Pick a valid date range" }); return; }
  res.json(report);
});

// GET /api/sale/report.pdf?from=ISO&to=ISO — the printable report is for managers only.
router.get("/report.pdf", authenticate, authorize("Manager"), async (req, res) => {
  const report = await salesReport(req.query);
  if (!report) { res.status(400).json({ message: "Pick a valid date range" }); return; }
  const pdf = await salesPdf(report, req.user!.email);
  const name = `sales-${bangkokDate(report.from)}-to-${bangkokDate(new Date(report.to.getTime() - 1))}.pdf`;
  res.type("application/pdf").attachment(name).send(pdf);
});

router.get("/:id", authenticate, async (req, res) => {
  const id = Number(req.params.id);
  const sale = Number.isInteger(id) ? await prisma.sale.findUnique({ where: { id }, include: { lines: true } }) : null;
  if (!sale) {
    res.status(404).json({ message: "Sale not found" });
    return;
  }
  res.json(sale);
});

export default router;
