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
    let r: Reservation;
    try {
      r = await withSqliteRetry(() => prisma.$transaction(async (tx) => {
        const claim = await tx.item.updateMany({ where: { id: q.itemId, stock: { gt: prisma.item.fields.held } }, data: { held: { increment: 1 } } });
        if (claim.count !== 1) throw new ReservationError("UNAVAILABLE", "This piece is no longer available"); // zero-row rule
        if (input.clientIp) {
          const live = await tx.reservation.count({ where: { clientIp: input.clientIp, status: { in: ["PENDING", "CAPTURING"] } } });
          if (live >= config.maxPendingPerIp) throw new ReservationError("IP_LIMIT", "Too many unpaid reservations; please pay or wait for them to lapse");
        }
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

  const load = (id: string) => prisma.reservation.findUnique({ where: { id }, include: { quote: true } });
  type Loaded = NonNullable<Awaited<ReturnType<typeof load>>>;
  const reload = async (id: string) => (await load(id))!;
  const isStale = (r: Reservation) => !r.claimedAt || r.claimedAt.getTime() <= now().getTime() - config.captureStaleSeconds * 1000;

  /** §4.3 step 7. Only from CAPTURING. */
  async function settle(r: Loaded, info: OrderInfo) {
    const ok = info.captureStatus === "COMPLETED" && info.capturedMinor === r.quote.depositMinor && info.currency === r.quote.currency;
    await prisma.reservation.updateMany({
      where: { id: r.id, status: "CAPTURING" },
      data: ok
        ? { status: "PAID", heldUntil: new Date(now().getTime() + config.holdMinutes * 60_000), captureStatus: info.captureStatus, capturedMinor: info.capturedMinor, claimedAt: null }
        : { status: "REVIEW", captureStatus: info.captureStatus ?? null, capturedMinor: info.capturedMinor ?? null, claimedAt: null },
    });
    return reload(r.id);
  }

  /** §4.3 step 6. Caller must hold the claim (claimedAt === claim). */
  async function doCapture(r: Loaded, claim: Date) {
    const res = await paypal.captureOrder(r.paypalOrderId!, `capture-${r.id}`);
    if (res.kind === "ok") return settle(r, res.value);
    if (res.kind === "refused" && res.issue === "ORDER_ALREADY_CAPTURED") {
      const o = await paypal.getOrder(r.paypalOrderId!);
      return o.kind === "ok" && o.value.orderStatus === "COMPLETED" ? settle(r, o.value) : reload(r.id);
    }
    if (res.kind === "refused") {
      const mine = { claimedAt: claim };
      if (r.heldUntil > now()) await transition(r.id, "CAPTURING", "PENDING", { claimedAt: null }, false, mine);
      else await transition(r.id, "CAPTURING", "CANCELLED", { claimedAt: null }, true, mine);
    }
    return reload(r.id); // unknown: stays CAPTURING
  }

  /** §4.3 step 4. Never calls captureOrder unless it takes over a stale claim. */
  async function resolveCapturing(r: Loaded) {
    const o = await paypal.getOrder(r.paypalOrderId!);
    if (o.kind === "ok" && o.value.orderStatus === "COMPLETED") return settle(r, o.value);
    if (!isStale(r) || o.kind === "unknown") return r;
    if (o.kind === "refused" && o.status !== 404) return r;
    if (o.kind === "ok" && o.value.orderStatus === "APPROVED") {
      const claim = now();
      const took = await prisma.reservation.updateMany({ where: { id: r.id, status: "CAPTURING", claimedAt: r.claimedAt }, data: { claimedAt: claim } });
      return took.count === 1 ? doCapture(r, claim) : reload(r.id);
    }
    // stale + lapsed (VOIDED, 404, …)
    await prisma.reservation.updateMany({ where: { id: r.id, status: "CAPTURING", claimedAt: r.claimedAt }, data: { status: "REVIEW", claimedAt: null } });
    return reload(r.id);
  }

  async function captureReservation(id: string) {
    const r = await load(id);
    if (!r) throw new ReservationError("NOT_FOUND", "Reservation not found");
    if (r.status === "CAPTURING") return resolveCapturing(r);
    if (r.status !== "PENDING" || !r.paypalOrderId) return r;
    const claim = now();
    const won = await prisma.reservation.updateMany({ where: { id, status: "PENDING", heldUntil: { gt: claim } }, data: { status: "CAPTURING", claimedAt: claim } });
    if (won.count !== 1) {
      await releaseExpired();
      return reload(id);
    }
    return doCapture({ ...r, status: "CAPTURING", claimedAt: claim }, claim);
  }

  async function acceptReview(id: string) {
    if (!(await load(id))) throw new ReservationError("NOT_FOUND", "Reservation not found");
    await transition(id, "REVIEW", "PAID", { heldUntil: new Date(now().getTime() + config.holdMinutes * 60_000) });
    return reload(id);
  }
  async function cancelReview(id: string) {
    if (!(await load(id))) throw new ReservationError("NOT_FOUND", "Reservation not found");
    await transition(id, "REVIEW", "CANCELLED", {}, true);
    return reload(id);
  }
  async function list() {
    await releaseExpired();
    return prisma.reservation.findMany({ orderBy: { createdAt: "desc" }, include: { item: true, quote: true }, take: 200 });
  }

  return { quotePrice, activeQuote, createReservation, releaseExpired, captureReservation, acceptReview, cancelReview, list };
}
