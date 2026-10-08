// server/test/schema.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { freshDb } from "./helpers";

const { prisma } = await freshDb();

test("reservation schema: held counter, quote, reservation, sale deposit", async () => {
  const item = await prisma.item.create({ data: { title: "T", image: "x", weight: 15.244, purity: 0.965, laborFee: 800, stock: 1 } });
  assert.equal(item.held, 0);
  const q = await prisma.quote.create({ data: { itemId: item.id, goldRate: 3000, priceSatang: 4_493_000, depositSatang: 449_300, currency: "THB", depositMinor: 449_300, expiresAt: new Date() } });
  const r = await prisma.reservation.create({ data: { quoteId: q.id, itemId: item.id, customerName: "A", contact: "a@b.c", status: "PENDING", heldUntil: new Date() } });
  assert.equal(r.claimedAt, null);
  await assert.rejects(prisma.reservation.create({ data: { quoteId: q.id, itemId: item.id, customerName: "B", contact: "b@b.c", status: "PENDING", heldUntil: new Date() } }), /Unique constraint/);
  const claim = await prisma.item.updateMany({ where: { id: item.id, stock: { gt: prisma.item.fields.held } }, data: { held: { increment: 1 } } });
  assert.equal(claim.count, 1);
  const again = await prisma.item.updateMany({ where: { id: item.id, stock: { gt: prisma.item.fields.held } }, data: { held: { increment: 1 } } });
  assert.equal(again.count, 0, "field-reference claim must refuse when stock == held");
});
