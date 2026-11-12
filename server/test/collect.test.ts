// server/test/collect.test.ts
import { test, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { freshDb, startApp, authCookie } from "./helpers";

const { prisma } = await freshDb();
const app = await startApp();
after(() => app.close());
const cookie = authCookie();
let itemId: string, rid: string;

async function paidReservation(status = "PAID", heldUntil = new Date(Date.now() + 3600_000)) {
  const q = await prisma.quote.create({ data: { itemId, goldRate: 3000, priceSatang: 4_493_100, depositSatang: 449_300, currency: "THB", depositMinor: 449_300, expiresAt: new Date() } });
  await prisma.item.update({ where: { id: itemId }, data: { held: { increment: 1 } } });
  return (await prisma.reservation.create({ data: { quoteId: q.id, itemId, customerName: "Ann", contact: "a@x.com", status, heldUntil } })).id;
}
const collect = (body: object) => fetch(`${app.base}/api/sale/collect`, { method: "POST", headers: { "content-type": "application/json", cookie }, body: JSON.stringify(body) });
const item = () => prisma.item.findUniqueOrThrow({ where: { id: itemId } });

beforeEach(async () => {
  await prisma.saleLine.deleteMany(); await prisma.sale.deleteMany(); await prisma.reservation.deleteMany(); await prisma.quote.deleteMany(); await prisma.item.deleteMany();
  itemId = (await prisma.item.create({ data: { title: "Chain", image: "x", weight: 15.244, purity: 0.965, laborFee: 800, stock: 1 } })).id;
  rid = await paidReservation();
});

test("collect uses the quote's price and rate, subtracts the deposit, ignores browser rate/cart", async () => {
  const r = await collect({ reservationId: rid, payment: "Cash", amountPaid: 50_000, goldRate: 1, lines: [{ itemId, quantity: 9 }] });
  assert.equal(r.status, 201);
  const sale = await r.json();
  assert.equal(sale.goldRate, 3000);
  assert.equal(sale.subtotal, 44_931);
  assert.equal(sale.depositPaid, 4_493);
  assert.equal(sale.total, 40_438);
  assert.equal(sale.change, 50_000 - 40_438);
  assert.equal(sale.lines[0].quantity, 1);
  assert.equal(sale.saleKey, `res-${rid}`);
  const it = await item();
  assert.deepEqual([it.stock, it.held], [0, 0]); // self-hold: stock - held was 0, still collected
  assert.equal((await prisma.reservation.findUniqueOrThrow({ where: { id: rid } })).status, "COLLECTED");
});

test("second collection replays: sequential and concurrent → one sale, stock once", async () => {
  const a = await (await collect({ reservationId: rid, payment: "Cash", amountPaid: 50_000 })).json();
  const b = await (await collect({ reservationId: rid, payment: "Cash", amountPaid: 50_000 })).json();
  assert.equal(a.id, b.id);
  await prisma.item.update({ where: { id: itemId }, data: { stock: 2 } });
  const rid2 = await paidReservation();
  const [c, d] = await Promise.all([collect({ reservationId: rid2, payment: "Cash", amountPaid: 50_000 }), collect({ reservationId: rid2, payment: "Cash", amountPaid: 50_000 })]);
  const [cj, dj] = [await c.json(), await d.json()];
  assert.deepEqual([c.status, d.status], [201, 201]);
  assert.equal(cj.id, dj.id);
  assert.equal(await prisma.sale.count(), 2);
  assert.deepEqual([(await item()).stock, (await item()).held], [1, 0]);
});

test("EXPIRED, PENDING, REVIEW, past heldUntil → 409; amount too low → 400", async () => {
  for (const s of ["EXPIRED", "PENDING", "REVIEW"]) {
    await prisma.reservation.update({ where: { id: rid }, data: { status: s } });
    assert.equal((await collect({ reservationId: rid, payment: "Cash", amountPaid: 50_000 })).status, 409);
  }
  await prisma.reservation.update({ where: { id: rid }, data: { status: "PAID", heldUntil: new Date(Date.now() - 1000) } });
  assert.equal((await collect({ reservationId: rid, payment: "Cash", amountPaid: 50_000 })).status, 409);
  // /collect ran releaseExpired on the past heldUntil row — status is now EXPIRED and the hold is released.
  assert.equal((await prisma.reservation.findUniqueOrThrow({ where: { id: rid } })).status, "EXPIRED");
  assert.equal((await item()).held, 0);
  // Reset to PAID + future held and restore the hold so the low-amount call can reach the 400 path.
  await prisma.reservation.update({ where: { id: rid }, data: { status: "PAID", heldUntil: new Date(Date.now() + 3600_000) } });
  await prisma.item.update({ where: { id: itemId }, data: { held: 1 } });
  assert.equal((await collect({ reservationId: rid, payment: "Cash", amountPaid: 10 })).status, 400);
  assert.equal(await prisma.sale.count(), 0);
});

test("reservation no longer PAID inside the transaction → 409, nothing written", async () => {
  // The conditional PAID→COLLECTED update (zero-row rule) is the backstop if reads ever interleave; with
  // serialised SQLite transactions the status check catches it first. Task 4's claim race exercises the rule directly.
  await prisma.reservation.update({ where: { id: rid }, data: { status: "COLLECTED" } });
  const r = await collect({ reservationId: rid, payment: "Cash", amountPaid: 50_000 });
  assert.equal(r.status, 409);
  assert.equal(await prisma.sale.count(), 0);
  assert.equal((await item()).stock, 1);
});

test("normal sale cannot take a held unit", async () => {
  const r = await fetch(`${app.base}/api/sale`, { method: "POST", headers: { "content-type": "application/json", cookie }, body: JSON.stringify({ payment: "Cash", amountPaid: 100_000, goldRate: 3000, lockedAt: new Date().toISOString(), lines: [{ itemId, quantity: 1 }] }) });
  assert.equal(r.status, 409);
});

test("editor: stock below held, delete with hold, delete with history → 409; quotes cascade", async () => {
  const patch = await fetch(`${app.base}/api/item/update/${itemId}`, { method: "PATCH", headers: { "content-type": "application/json", cookie }, body: JSON.stringify({ stock: 0 }) });
  assert.equal(patch.status, 409);
  assert.equal((await fetch(`${app.base}/api/item/delete/${itemId}`, { method: "DELETE", headers: { cookie } })).status, 409);
  await prisma.reservation.update({ where: { id: rid }, data: { status: "CANCELLED" } });
  await prisma.item.update({ where: { id: itemId }, data: { held: 0 } });
  assert.equal((await fetch(`${app.base}/api/item/delete/${itemId}`, { method: "DELETE", headers: { cookie } })).status, 409, "history blocks delete (Review Focus 4)");
  const other = (await prisma.item.create({ data: { title: "Ring", image: "x", weight: 3.81, purity: 0.965, laborFee: 300, stock: 1 } })).id;
  await prisma.quote.create({ data: { itemId: other, goldRate: 3000, priceSatang: 1, depositSatang: 1, currency: "THB", depositMinor: 1, expiresAt: new Date() } });
  assert.equal((await fetch(`${app.base}/api/item/delete/${other}`, { method: "DELETE", headers: { cookie } })).status, 200);
  assert.equal(await prisma.quote.count({ where: { itemId: other } }), 0);
});

test("editor updateItem: PATCH stock below held → 409, stock unchanged", async () => {
  // itemId has stock=1, held=1; PATCH /api/item/update/:id with stock=0 (below held) must refuse
  // and the row must be untouched.
  const r = await fetch(`${app.base}/api/item/update/${itemId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ stock: 0 }),
  });
  assert.equal(r.status, 409);
  const it = await item();
  assert.equal(it.stock, 1);
  assert.equal(it.held, 1);
});
