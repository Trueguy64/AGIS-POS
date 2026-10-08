// server/test/reservations-capture.test.ts
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { freshDb, fakeClock } from "./helpers";
import { config, rate, fakePayPal } from "./fakes";
import { createReservations } from "../src/reservations/service";

const { prisma } = await freshDb();
let clock: ReturnType<typeof fakeClock>, fake: ReturnType<typeof fakePayPal>, svc: ReturnType<typeof createReservations>, itemId: string, rid: string;
const status = async (id = rid) => (await prisma.reservation.findUniqueOrThrow({ where: { id } })).status;
const held = async () => (await prisma.item.findUniqueOrThrow({ where: { id: itemId } })).held;
const captures = () => fake.pp.calls.filter((c) => c.op === "captureOrder").length;
const deferred = <T,>() => { let resolve!: (v: T) => void; const p = new Promise<T>((r) => (resolve = r)); return { p, resolve }; };

beforeEach(async () => {
  await prisma.reservation.deleteMany(); await prisma.quote.deleteMany(); await prisma.item.deleteMany();
  clock = fakeClock(); fake = fakePayPal();
  svc = createReservations({ prisma, paypal: fake.pp, now: clock.now, getRate: rate, config });
  itemId = (await prisma.item.create({ data: { title: "Chain", image: "x", weight: 15.244, purity: 0.965, laborFee: 800, stock: 1 } })).id;
  rid = (await svc.createReservation({ quoteId: (await svc.quotePrice(itemId)).quoteId, customerName: "Ann", contact: "ann@x.com" })).reservationId;
  fake.pp.calls.length = 0;
});

test("step 1: uses the stored order id; captures with capture-<id>", async () => {
  const r = await svc.captureReservation(rid);
  assert.equal(r.status, "PAID");
  assert.deepEqual(fake.pp.calls[0], { op: "captureOrder", args: ["O1", `capture-${rid}`] });
  assert.equal(r.heldUntil.getTime(), clock.now().getTime() + 2880 * 60_000);
  assert.equal(await held(), 1);
});

test("step 2: PAID/REVIEW/COLLECTED returned unchanged, no PayPal call", async () => {
  for (const s of ["PAID", "REVIEW", "COLLECTED"]) {
    await prisma.reservation.update({ where: { id: rid }, data: { status: s } });
    assert.equal((await svc.captureReservation(rid)).status, s);
  }
  assert.equal(fake.pp.calls.length, 0);
});

test("step 5: after the PENDING hold passed → no PayPal call, CANCELLED, released once", async () => {
  clock.advance(31 * 60_000);
  assert.equal((await svc.captureReservation(rid)).status, "CANCELLED");
  assert.equal(fake.pp.calls.length, 0);
  assert.equal(await held(), 0);
});

test("self-hold: stock - held = 0 because of this reservation; capture proceeds", async () => {
  assert.equal(await held(), 1); // stock 1, held 1
  assert.equal((await svc.captureReservation(rid)).status, "PAID");
});

test("twice sequential and concurrent → one capture call, PAID", async () => {
  await Promise.all([svc.captureReservation(rid), svc.captureReservation(rid)]);
  await svc.captureReservation(rid);
  assert.equal(captures(), 1);
  assert.equal(await status(), "PAID");
});

test("overlapping captures: second caller only calls getOrder; PayPal would reject a second capture; ends PAID", async () => {
  const gate = deferred<void>();
  fake.pp.script("captureOrder", async () => { await gate.p; return { kind: "ok", value: fake.paid(449300) } as const; }, async () => ({ kind: "refused", status: 422, issue: "DUPLICATE_REQUEST" } as const));
  fake.pp.script("getOrder", async () => ({ kind: "ok", value: { orderStatus: "APPROVED" } } as const));
  const first = svc.captureReservation(rid);
  await new Promise((r) => setTimeout(r, 10));
  const second = await svc.captureReservation(rid); // claim is fresh: leaves it alone
  assert.equal(second.status, "CAPTURING");
  gate.resolve();
  assert.equal((await first).status, "PAID");
  assert.equal(captures(), 1);
});

test("CAPTURING race: expiry during a slow capture does not release; ends PAID", async () => {
  const gate = deferred<void>();
  fake.pp.script("captureOrder", async () => { await gate.p; return { kind: "ok", value: fake.paid(449300) } as const; });
  const p = svc.captureReservation(rid);
  await new Promise((r) => setTimeout(r, 10));
  clock.advance(31 * 60_000);
  assert.equal(await svc.releaseExpired(), 0);
  gate.resolve();
  assert.equal((await p).status, "PAID");
  assert.equal(await held(), 1);
});

test("unknown outcome leaves CAPTURING; later check settles from getOrder without a second capture", async () => {
  fake.pp.script("captureOrder", async () => ({ kind: "unknown", error: "timeout" } as const));
  assert.equal((await svc.captureReservation(rid)).status, "CAPTURING");
  assert.equal(await held(), 1);
  fake.pp.script("getOrder", async () => ({ kind: "ok", value: fake.paid(449300) } as const));
  assert.equal((await svc.captureReservation(rid)).status, "PAID");
  assert.equal(captures(), 1);
});

test("step 4: APPROVED with fresh claim → unchanged; any other status with fresh claim → unchanged", async () => {
  fake.pp.script("captureOrder", async () => ({ kind: "unknown", error: "timeout" } as const));
  await svc.captureReservation(rid);
  fake.pp.script("getOrder", async () => ({ kind: "ok", value: { orderStatus: "APPROVED" } } as const), async () => ({ kind: "ok", value: { orderStatus: "VOIDED" } } as const));
  assert.equal((await svc.captureReservation(rid)).status, "CAPTURING");
  assert.equal((await svc.captureReservation(rid)).status, "CAPTURING");
  assert.equal(captures(), 1);
});

test("stale takeover: APPROVED + stale claim → exactly one re-capture with the same request id", async () => {
  fake.pp.script("captureOrder", async () => ({ kind: "unknown", error: "timeout" } as const));
  await svc.captureReservation(rid);
  clock.advance(61_000);
  fake.pp.script("getOrder", async () => ({ kind: "ok", value: { orderStatus: "APPROVED" } } as const), async () => ({ kind: "ok", value: { orderStatus: "APPROVED" } } as const));
  await Promise.all([svc.captureReservation(rid), svc.captureReservation(rid)]);
  const caps = fake.pp.calls.filter((c) => c.op === "captureOrder");
  assert.equal(caps.length, 2);
  assert.deepEqual(caps.map((c) => c.args[1]), [`capture-${rid}`, `capture-${rid}`]);
  assert.equal(await status(), "PAID");
});

test("stale claim on a lapsed order (VOIDED, and 404) → REVIEW with hold kept", async () => {
  for (const lapsed of [async () => ({ kind: "ok", value: { orderStatus: "VOIDED" } } as const), async () => ({ kind: "refused", status: 404, issue: "NOT_FOUND" } as const)]) {
    await prisma.reservation.update({ where: { id: rid }, data: { status: "CAPTURING", claimedAt: clock.now() } });
    clock.advance(61_000);
    fake.pp.script("getOrder", lapsed);
    assert.equal((await svc.captureReservation(rid)).status, "REVIEW");
    assert.equal(await held(), 1);
  }
});

test("definite refusal: back to PENDING within hold; CANCELLED + release after it", async () => {
  fake.pp.script("captureOrder", async () => ({ kind: "refused", status: 422, issue: "ORDER_NOT_APPROVED" } as const));
  assert.equal((await svc.captureReservation(rid)).status, "PENDING");
  assert.equal(await held(), 1);
  fake.pp.script("captureOrder", async () => { clock.advance(31 * 60_000); return { kind: "refused", status: 422, issue: "INSTRUMENT_DECLINED" } as const; });
  assert.equal((await svc.captureReservation(rid)).status, "CANCELLED");
  assert.equal(await held(), 0);
});

test("settlement: capture PENDING, other currency, other amount → REVIEW; expiry never touches REVIEW", async () => {
  const cases = [
    { orderStatus: "COMPLETED", captureStatus: "PENDING", capturedMinor: 449300, currency: "THB" },
    { orderStatus: "COMPLETED", captureStatus: "COMPLETED", capturedMinor: 449300, currency: "USD" },
    { orderStatus: "COMPLETED", captureStatus: "COMPLETED", capturedMinor: 1, currency: "THB" },
  ];
  for (const value of cases) {
    await prisma.reservation.update({ where: { id: rid }, data: { status: "PENDING", heldUntil: new Date(clock.now().getTime() + 60_000), claimedAt: null } });
    fake.pp.script("captureOrder", async () => ({ kind: "ok", value } as const));
    assert.equal((await svc.captureReservation(rid)).status, "REVIEW");
  }
  clock.advance(10_000 * 60_000);
  await svc.releaseExpired();
  assert.equal(await status(), "REVIEW");
  assert.equal(await held(), 1);
});

test("review actions: accept → PAID with new hold; cancel → CANCELLED released once; non-REVIEW unchanged", async () => {
  await prisma.reservation.update({ where: { id: rid }, data: { status: "REVIEW" } });
  const a = await svc.acceptReview(rid);
  assert.equal(a.status, "PAID");
  assert.equal(a.heldUntil.getTime(), clock.now().getTime() + 2880 * 60_000);
  assert.equal((await svc.cancelReview(rid)).status, "PAID"); // not REVIEW → unchanged
  await prisma.reservation.update({ where: { id: rid }, data: { status: "REVIEW" } });
  assert.equal((await svc.cancelReview(rid)).status, "CANCELLED");
  assert.equal((await svc.cancelReview(rid)).status, "CANCELLED");
  assert.equal(await held(), 0);
});