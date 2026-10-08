import type { PrismaClient, Reservation, Item, Quote } from "../generated/prisma/client";
import { Prisma } from "../generated/prisma/client";
import type { PayPal, OrderInfo } from "../paypal/client";
import { fromMinor } from "../paypal/client";
import { unitPrice } from "../lib/pricing";
import { withSqliteRetry } from "../lib/sqliteRetry";

export type ReservationCode = "NOT_FOUND" | "QUOTE_EXPIRED" | "QUOTE_USED" | "UNAVAILABLE" | "IP_LIMIT" | "PAYPAL_UNAVAILABLE" | "RATE_UNAVAILABLE" | "INVALID_CUSTOMER" | "BAD_STATE";
export class ReservationError extends Error {
  constructor(public code: ReservationCode, message: string) { super(message); }
}
export type Config = { depositPercent: number; quoteMinutes: number; pendingMinutes: number; holdMinutes: number; captureStaleSeconds: number; currency: "THB" | "USD"; maxPendingPerIp: number };
export function configFromEnv(env: NodeJS.ProcessEnv = process.env): Config {
  const n = (k: string, d: number) => (env[k] ? Number(env[k]) : d);
  return {
    depositPercent: n("DEPOSIT_PERCENT", 10), quoteMinutes: n("QUOTE_MINUTES", 15), pendingMinutes: n("PENDING_MINUTES", 30),
    holdMinutes: n("HOLD_MINUTES", 2880), captureStaleSeconds: n("CAPTURE_STALE_SECONDS", 60),
    currency: env.PAYPAL_CURRENCY === "USD" ? "USD" : "THB", maxPendingPerIp: 2,
  };
}
export type Deps = { prisma: PrismaClient; paypal: PayPal; now: () => Date; getRate: () => Promise<{ thbPerGram: number; usdToThb: number }>; config: Config };
export type QuoteCard = { quoteId: string; itemId: string; title: string; priceTHB: number; depositTHB: number; currency: string; depositAmount: string; expiresAt: string };

const HOLDING = ["PENDING", "CAPTURING", "PAID", "REVIEW"];
const addMin = (d: Date, m: number) => new Date(d.getTime() + m * 60_000);

export function createReservations({ prisma, paypal, now, getRate, config }: Deps) {
  const card = (q: Quote & { item: Item }): QuoteCard => ({
    quoteId: q.id, itemId: q.itemId, title: q.item.title, priceTHB: q.priceSatang / 100, depositTHB: q.depositSatang / 100,
    currency: q.currency, depositAmount: fromMinor(q.depositMinor), expiresAt: q.expiresAt.toISOString(),
  });

  /** Conditional status change; releases the hold in the same transaction iff the change happened. */
  async function transition(id: string, from: string | string[], to: string, extra: Prisma.ReservationUpdateManyMutationInput = {}, release = false, where: Prisma.ReservationWhereInput = {}) {
    return withSqliteRetry(() => prisma.$transaction(async (tx) => {
      const u = await tx.reservation.updateMany({ where: { id, status: Array.isArray(from) ? { in: from } : from, ...where }, data: { status: to, ...extra } });
      if (u.count === 1 && release) {
        const r = await tx.reservation.findUniqueOrThrow({ where: { id } });
        await tx.item.update({ where: { id: r.itemId }, data: { held: { decrement: 1 } } });
      }
      return u.count === 1;
    }));
  }

  async function releaseExpired() {
    const due = await prisma.reservation.findMany({ where: { status: { in: ["PENDING", "PAID"] }, heldUntil: { lte: now() } }, select: { id: true, status: true } });
    let n = 0;
    for (const r of due) if (await transition(r.id, r.status, r.status === "PENDING" ? "CANCELLED" : "EXPIRED", {}, true, { heldUntil: { lte: now() } })) n++;
    return n;
  }

  async function quotePrice(itemId: string): Promise<QuoteCard> {
    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) throw new ReservationError("NOT_FOUND", "No such piece");
    let rate;
    try { rate = await getRate(); } catch { throw new ReservationError("RATE_UNAVAILABLE", "Live gold rate unavailable"); }
    const priceBaht = unitPrice(item.weight, item.purity, item.laborFee, rate.thbPerGram);
    const depositBaht = Math.round((priceBaht * config.depositPercent) / 100);
    const depositMinor = config.currency === "THB" ? depositBaht * 100 : Math.round((depositBaht / rate.usdToThb) * 100);
    const q = await prisma.quote.create({
      data: { itemId, goldRate: rate.thbPerGram, priceSatang: priceBaht * 100, depositSatang: depositBaht * 100, currency: config.currency, depositMinor, expiresAt: addMin(now(), config.quoteMinutes) },
      include: { item: true },
    });
    return card(q);
  }

  async function activeQuote(quoteId: string) {
    const q = await prisma.quote.findUnique({ where: { id: quoteId }, include: { item: true, reservation: true } });
    return q && !q.reservation && q.expiresAt > now() ? card(q) : null;
  }

  async function createReservation(input: { quoteId: string; customerName: string; contact: string; clientIp?: string }) {
    const customerName = input.customerName.trim(), contact = input.contact.trim();
    if (customerName.length < 1 || customerName.length > 100 || contact.length < 3 || contact.length > 200)
      throw new ReservationError("INVALID_CUSTOMER", "Please give a name (up to 100 characters) and a phone number or email");
    await releaseExpired();
    const q = await prisma.quote.findUnique({ where: { id: input.quoteId }, include: { reservation: true } });
    if (!q) throw new ReservationError("NOT_FOUND", "Quote not found");
    if (q.reservation) throw new ReservationError("QUOTE_USED", "This quote has already been used");
    if (q.expiresAt <= now()) throw new ReservationError("QUOTE_EXPIRED", "This quote has expired");
    if (input.clientIp) {
      const live = await prisma.reservation.count({ where: { clientIp: input.clientIp, status: { in: ["PENDING", "CAPTURING"] } } });
      if (live >= config.maxPendingPerIp) throw new ReservationError("IP_LIMIT", "Too many unpaid reservations; please pay or wait for them to lapse");
    }
    let r: Reservation;
    try {
      r = await withSqliteRetry(() => prisma.$transaction(async (tx) => {
        const claim = await tx.item.updateMany({ where: { id: q.itemId, stock: { gt: prisma.item.fields.held } }, data: { held: { increment: 1 } } });
        if (claim.count !== 1) throw new ReservationError("UNAVAILABLE", "This piece is no longer available"); // zero-row rule
        return tx.reservation.create({ data: { quoteId: q.id, itemId: q.itemId, customerName, contact, clientIp: input.clientIp, status: "PENDING", heldUntil: addMin(now(), config.pendingMinutes) } });
      }));
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new ReservationError("QUOTE_USED", "This quote has already been used");
      throw e;
    }
    const o = await paypal.createOrder(q.depositMinor, q.currency, `create-${r.id}`);
    if (o.kind === "ok") {
      await prisma.reservation.update({ where: { id: r.id }, data: { paypalOrderId: o.value.orderId } });
      return { reservationId: r.id, paypalOrderId: o.value.orderId, currency: q.currency };
    }
    await transition(r.id, "PENDING", "CANCELLED", {}, true);
    throw new ReservationError("PAYPAL_UNAVAILABLE", "PayPal is unavailable, please try again");
  }

  // captureReservation, acceptReview, cancelReview, list: Task 5
  return { quotePrice, activeQuote, createReservation, releaseExpired, transition };
}
