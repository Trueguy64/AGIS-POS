// server/test/reservations-claim.test.ts
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { freshDb, fakeClock } from "./helpers";
import { config, rate, fakePayPal } from "./fakes";
import { createReservations, ReservationError } from "../src/reservations/service";

const { prisma } = await freshDb();
let clock: ReturnType<typeof fakeClock>, fake: ReturnType<typeof fakePayPal>, svc: ReturnType<typeof createReservations>, itemId: string;

beforeEach(async () => {
  await prisma.reservation.deleteMany(); await prisma.quote.deleteMany(); await prisma.item.deleteMany();
  clock = fakeClock(); fake = fakePayPal();
  svc = createReservations({ prisma, paypal: fake.pp, now: clock.now, getRate: rate, config });
  itemId = (await prisma.item.create({ data: { title: "Chain 1 Baht", image: "x", weight: 15.244, purity: 0.965, laborFee: 800, stock: 1 } })).id;
});
const code = (c: string) => (e: unknown) => e instanceof ReservationError && e.code === c;
const reserve = (quoteId: string, ip = "1.1.1.1") => svc.createReservation({ quoteId, customerName: "Ann", contact: "ann@example.com", clientIp: ip });

test("quote: server price, deposit rounded once to whole baht, expiry", async () => {
  const q = await svc.quotePrice(itemId);
  const price = Math.round(15.244 * 0.965 * 3000 + 800); // 44931
  assert.equal(q.priceTHB, price);
  assert.equal(q.depositTHB, Math.round(price * 0.1)); // 4493
  assert.equal(q.depositAmount, "4493.00");
  const row = await prisma.quote.findUniqueOrThrow({ where: { id: q.quoteId } });
  assert.equal(row.priceSatang, price * 100);
  assert.equal(row.depositMinor, 449300);
  assert.equal(row.expiresAt.toISOString(), new Date(clock.now().getTime() + 15 * 60_000).toISOString());
});

test("quote refuses when the rate feed is down (Review Focus 1)", async () => {
  const down = createReservations({ prisma, paypal: fake.pp, now: clock.now, getRate: async () => { throw new Error("feed down"); }, config });
  await assert.rejects(down.quotePrice(itemId), code("RATE_UNAVAILABLE"));
  assert.equal(await prisma.quote.count(), 0);
});

test("quote in USD converts at quote time", async () => {
  const usd = createReservations({ prisma, paypal: fake.pp, now: clock.now, getRate: rate, config: { ...config, currency: "USD" } });
  const q = await usd.quotePrice(itemId);
  assert.equal(q.currency, "USD");
  assert.equal(q.depositAmount, "124.81"); // 4493 / 36 = 124.805… → 12481 cents
});

test("reserve: expired, used and unknown quotes refused", async () => {
  const q = await svc.quotePrice(itemId);
  clock.advance(16 * 60_000);
  await assert.rejects(reserve(q.quoteId), code("QUOTE_EXPIRED"));
  await assert.rejects(reserve("nope"), code("NOT_FOUND"));
  clock.set("2026-11-01T10:00:00.000Z");
  await prisma.item.update({ where: { id: itemId }, data: { stock: 2 } });
  await reserve(q.quoteId);
  await assert.rejects(reserve(q.quoteId), code("QUOTE_USED"));
});

test("reserve: invalid customer refused before any claim (Review Focus 2)", async () => {
  const q = await svc.quotePrice(itemId);
  await assert.rejects(svc.createReservation({ quoteId: q.quoteId, customerName: "  ", contact: "a@b.c" }), code("INVALID_CUSTOMER"));
  await assert.rejects(svc.createReservation({ quoteId: q.quoteId, customerName: "x".repeat(5000), contact: "a@b.c" }), code("INVALID_CUSTOMER"));
  await assert.rejects(svc.createReservation({ quoteId: q.quoteId, customerName: "Ann", contact: "ab" }), code("INVALID_CUSTOMER"));
  assert.equal((await prisma.item.findUniqueOrThrow({ where: { id: itemId } })).held, 0);
});

test("reserve: claims a unit, stores PENDING with pending hold and the PayPal order", async () => {
  const q = await svc.quotePrice(itemId);
  const r = await reserve(q.quoteId);
  assert.equal(r.paypalOrderId, "O1");
  assert.deepEqual(fake.pp.calls[0], { op: "createOrder", args: [449300, "THB", `create-${r.reservationId}`] });
  const row = await prisma.reservation.findUniqueOrThrow({ where: { id: r.reservationId } });
  assert.equal(row.status, "PENDING");
  assert.equal(row.clientIp, "1.1.1.1");
  assert.equal(row.heldUntil.getTime(), clock.now().getTime() + 30 * 60_000);
  assert.equal((await prisma.item.findUniqueOrThrow({ where: { id: itemId } })).held, 1);
});

test("race: two quotes, last unit, concurrent reserve → exactly one", async () => {
  const [a, b] = [await svc.quotePrice(itemId), await svc.quotePrice(itemId)];
  const results = await Promise.allSettled([reserve(a.quoteId, "1.1.1.1"), reserve(b.quoteId, "2.2.2.2")]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.ok(results.some((r) => r.status === "rejected" && code("UNAVAILABLE")(r.reason)));
  assert.equal((await prisma.item.findUniqueOrThrow({ where: { id: itemId } })).held, 1);
});

test("race: same quote from two tabs → one reservation, held once (Review Focus 3)", async () => {
  await prisma.item.update({ where: { id: itemId }, data: { stock: 3 } });
  const q = await svc.quotePrice(itemId);
  const results = await Promise.allSettled([reserve(q.quoteId), reserve(q.quoteId)]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.ok(results.some((r) => r.status === "rejected" && code("QUOTE_USED")(r.reason)));
  assert.equal((await prisma.item.findUniqueOrThrow({ where: { id: itemId } })).held, 1);
});

test("PayPal create error → CANCELLED, hold released once", async () => {
  fake.pp.script("createOrder", async () => ({ kind: "unknown", error: "503" }));
  const q = await svc.quotePrice(itemId);
  await assert.rejects(reserve(q.quoteId), code("PAYPAL_UNAVAILABLE"));
  const row = await prisma.reservation.findFirstOrThrow();
  assert.equal(row.status, "CANCELLED");
  assert.equal((await prisma.item.findUniqueOrThrow({ where: { id: itemId } })).held, 0);
  clock.advance(31 * 60_000);
  await svc.releaseExpired();
  assert.equal((await prisma.item.findUniqueOrThrow({ where: { id: itemId } })).held, 0);
});

test("expiry: PENDING → CANCELLED and PAID → EXPIRED release once; others untouched", async () => {
  await prisma.item.update({ where: { id: itemId }, data: { stock: 5 } });
  const ids: string[] = [];
  for (let i = 0; i < 4; i++) ids.push((await reserve((await svc.quotePrice(itemId)).quoteId, `9.9.9.${i}`)).reservationId);
  await prisma.reservation.update({ where: { id: ids[1] }, data: { status: "PAID" } });
  await prisma.reservation.update({ where: { id: ids[2] }, data: { status: "REVIEW" } });
  await prisma.reservation.update({ where: { id: ids[3] }, data: { status: "CAPTURING", claimedAt: clock.now() } });
  clock.advance(31 * 60_000);
  assert.equal(await svc.releaseExpired(), 2);
  assert.equal(await svc.releaseExpired(), 0);
  const st = Object.fromEntries((await prisma.reservation.findMany()).map((r) => [r.id, r.status]));
  assert.deepEqual([st[ids[0]], st[ids[1]], st[ids[2]], st[ids[3]]], ["CANCELLED", "EXPIRED", "REVIEW", "CAPTURING"]);
  assert.equal((await prisma.item.findUniqueOrThrow({ where: { id: itemId } })).held, 2);
});

test("per-IP limit counts only live PENDING/CAPTURING, after expiry", async () => {
  await prisma.item.update({ where: { id: itemId }, data: { stock: 5 } });
  await reserve((await svc.quotePrice(itemId)).quoteId);
  await reserve((await svc.quotePrice(itemId)).quoteId);
  await assert.rejects(reserve((await svc.quotePrice(itemId)).quoteId), code("IP_LIMIT"));
  clock.advance(31 * 60_000);
  await reserve((await svc.quotePrice(itemId)).quoteId); // the first two expired
});

test("per-IP limit: concurrent reserves from one IP, count is inside the claim transaction", async () => {
  await prisma.item.update({ where: { id: itemId }, data: { stock: 5 } });
  const [a, b, c] = [await svc.quotePrice(itemId), await svc.quotePrice(itemId), await svc.quotePrice(itemId)];
  const results = await Promise.allSettled([reserve(a.quoteId, "1.1.1.1"), reserve(b.quoteId, "1.1.1.1"), reserve(c.quoteId, "1.1.1.1")]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 2);
  assert.ok(results.some((r) => r.status === "rejected" && code("IP_LIMIT")(r.reason)));
  assert.equal((await prisma.item.findUniqueOrThrow({ where: { id: itemId } })).held, 2);
});

test("activeQuote: null when expired or used", async () => {
  await prisma.item.update({ where: { id: itemId }, data: { stock: 2 } });
  const q = await svc.quotePrice(itemId);
  assert.equal((await svc.activeQuote(q.quoteId))?.quoteId, q.quoteId);
  await reserve(q.quoteId);
  assert.equal(await svc.activeQuote(q.quoteId), null);
  const q2 = await svc.quotePrice(itemId);
  clock.advance(16 * 60_000);
  assert.equal(await svc.activeQuote(q2.quoteId), null);
});
