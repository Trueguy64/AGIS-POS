// server/test/reservation-ref.test.ts
import { test, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { freshDb, fakeClock, startApp } from "./helpers";
import { config, rate, fakePayPal } from "./fakes";
import { createReservations } from "../src/reservations/service";

const { prisma } = await freshDb();
const app = await startApp();
after(() => app.close());
let svc: ReturnType<typeof createReservations>, itemId: string;

beforeEach(async () => {
  await prisma.reservation.deleteMany(); await prisma.quote.deleteMany(); await prisma.item.deleteMany();
  svc = createReservations({ prisma, paypal: fakePayPal().pp, now: fakeClock().now, getRate: rate, config });
  itemId = (await prisma.item.create({ data: { title: "Chain 1 Baht", image: "x", weight: 15.244, purity: 0.965, laborFee: 800, stock: 2 } })).id;
});
const reserve = async (s = svc) => s.createReservation({ quoteId: (await s.quotePrice(itemId)).quoteId, customerName: "Ann", contact: "ann@example.com" });

test("a new reservation carries a stored short reference the customer can quote", async () => {
  const r = await reserve();
  assert.match(r.ref, /^R-[A-Z0-9]{6}$/);
  assert.equal((await prisma.reservation.findUniqueOrThrow({ where: { id: r.reservationId } })).ref, r.ref);
});

test("references are unique: a generated code that is already taken is drawn again", async () => {
  const codes = ["R-AAAAAA", "R-AAAAAA", "R-BBBBBB"];
  const s = createReservations({ prisma, paypal: fakePayPal().pp, now: fakeClock().now, getRate: rate, config, newRef: () => codes.shift()! });
  const [a, b] = [await reserve(s), await reserve(s)];
  assert.equal(a.ref, "R-AAAAAA");
  assert.equal(b.ref, "R-BBBBBB");
});

test("the reference finds the reservation, typed loosely, without the customer's contact details", async () => {
  const r = await reserve();
  const found = await svc.findByRef(` ${r.ref.slice(2).toLowerCase()} `);
  assert.equal(found?.ref, r.ref);
  assert.equal(found?.item, "Chain 1 Baht");
  assert.equal(found?.status, "PENDING");
  assert.equal(found?.balanceTHB, found!.priceTHB - found!.depositTHB);
  assert.doesNotMatch(JSON.stringify(found), /ann@example\.com|Ann/);
  assert.equal(await svc.findByRef("R-ZZZZZZ"), null);
  assert.equal(await svc.findByRef("R-"), null);
});

test("the deposit receipt PDF is only issued once the deposit is paid", async () => {
  const r = await reserve();
  const url = `${app.base}/api/reservation/${r.reservationId}/receipt.pdf`;
  assert.equal((await fetch(url)).status, 409);
  await prisma.reservation.update({ where: { id: r.reservationId }, data: { status: "PAID", capturedMinor: 449_300 } });
  const res = await fetch(url);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-type"), "application/pdf");
  assert.match(res.headers.get("content-disposition") ?? "", new RegExp(`${r.ref}\\.pdf`));
  assert.equal(Buffer.from(await res.arrayBuffer()).subarray(0, 4).toString(), "%PDF");
  assert.equal((await fetch(`${app.base}/api/reservation/nope/receipt.pdf`)).status, 404);
});
