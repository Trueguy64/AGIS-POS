// server/test/reservation-ref.test.ts
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { freshDb, fakeClock } from "./helpers";
import { config, rate, fakePayPal } from "./fakes";
import { createReservations, reservationRef } from "../src/reservations/service";

const { prisma } = await freshDb();
let svc: ReturnType<typeof createReservations>, itemId: string;

beforeEach(async () => {
  await prisma.reservation.deleteMany(); await prisma.quote.deleteMany(); await prisma.item.deleteMany();
  svc = createReservations({ prisma, paypal: fakePayPal().pp, now: fakeClock().now, getRate: rate, config });
  itemId = (await prisma.item.create({ data: { title: "Chain 1 Baht", image: "x", weight: 15.244, purity: 0.965, laborFee: 800, stock: 1 } })).id;
});

test("a new reservation carries a short reference the customer can quote", async () => {
  const r = await svc.createReservation({ quoteId: (await svc.quotePrice(itemId)).quoteId, customerName: "Ann", contact: "ann@example.com" });
  assert.match(r.ref, /^R-[A-Z0-9]{6}$/);
  assert.equal(r.ref, reservationRef(r.reservationId));
});

test("the reference finds the reservation, typed loosely, without the customer's contact details", async () => {
  const r = await svc.createReservation({ quoteId: (await svc.quotePrice(itemId)).quoteId, customerName: "Ann", contact: "ann@example.com" });
  const found = await svc.findByRef(` ${r.ref.slice(2).toLowerCase()} `);
  assert.equal(found?.ref, r.ref);
  assert.equal(found?.item, "Chain 1 Baht");
  assert.equal(found?.status, "PENDING");
  assert.equal(found?.balanceTHB, found!.priceTHB - found!.depositTHB);
  assert.doesNotMatch(JSON.stringify(found), /ann@example\.com|Ann/);
  assert.equal(await svc.findByRef("R-ZZZZZZ"), null);
  assert.equal(await svc.findByRef("R-"), null);
});
