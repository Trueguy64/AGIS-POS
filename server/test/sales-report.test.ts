// server/test/sales-report.test.ts
import { test, after, before } from "node:test";
import assert from "node:assert/strict";
import { freshDb, startApp, authCookie } from "./helpers";

const { prisma } = await freshDb();
const app = await startApp();
after(() => app.close());
const employee = authCookie({ id: 2, role: "Employee" });
const manager = authCookie({ id: 1, role: "Manager" });
const range = "from=2026-10-01T00:00:00.000Z&to=2026-10-02T00:00:00.000Z";

async function sale(createdAt: string, payment: string, subtotal: number, discount: number, quantity: number) {
  await prisma.sale.create({
    data: {
      createdAt: new Date(createdAt), cashierId: 2, cashierName: "สมชาย Somchai", payment, amountPaid: subtotal - discount, change: 0,
      goldRate: 4500, lockedAt: new Date(createdAt), subtotal, discount, total: subtotal - discount,
      lines: { create: [{ itemId: "x", title: "สร้อยคอ Chain", weight: 15.2, purity: 0.965, laborFee: 800, unitPrice: subtotal / quantity, quantity }] },
    },
  });
}

before(async () => {
  await sale("2026-10-01T03:00:00.000Z", "Cash", 40_000, 1_000, 2);
  await sale("2026-10-01T09:00:00.000Z", "PromptPay", 30_000, 0, 1);
  await sale("2026-10-02T03:00:00.000Z", "Cash", 99_999, 0, 1); // outside the range
});

const get = (path: string, cookie?: string) => fetch(`${app.base}/api/sale${path}`, { headers: cookie ? { cookie } : {} });

test("staff can list sales in a range with a summary, newest first", async () => {
  const r = await get(`?${range}`, employee);
  assert.equal(r.status, 200);
  const body = await r.json();
  assert.deepEqual(body.sales.map((s: { total: number }) => s.total), [30_000, 39_000]);
  assert.deepEqual(body.sales[1].pieces, 2);
  assert.deepEqual(body.summary, { count: 2, pieces: 3, subtotal: 70_000, discount: 1_000, depositPaid: 0, total: 69_000, cash: 39_000, promptPay: 30_000 });
});

test("listing rejects a missing or backwards range", async () => {
  assert.equal((await get("", employee)).status, 400);
  assert.equal((await get("?from=2026-10-02T00:00:00.000Z&to=2026-10-01T00:00:00.000Z", employee)).status, 400);
});

test("listing requires sign-in", async () => {
  assert.equal((await get(`?${range}`)).status, 401);
});

test("staff cannot generate the PDF report", async () => {
  assert.equal((await get(`/report.pdf?${range}`, employee)).status, 403);
});

test("a manager gets the PDF report", async () => {
  const r = await get(`/report.pdf?${range}`, manager);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("content-type"), "application/pdf");
  assert.match(r.headers.get("content-disposition") ?? "", /attachment; filename="sales-2026-10-01/);
  const bytes = Buffer.from(await r.arrayBuffer());
  assert.equal(bytes.subarray(0, 4).toString(), "%PDF");
});

test("a long report flows onto pages without spilling cells onto extra ones", async () => {
  const { salesPdf } = await import("../src/lib/salesPdf");
  const sales = Array.from({ length: 100 }, (_, i) => ({ id: i + 1, createdAt: new Date("2026-10-01T03:00:00Z"), cashierName: "Somchai", payment: "Cash", pieces: 1, total: 1000 }));
  const summary = { count: 100, pieces: 100, subtotal: 100_000, discount: 0, depositPaid: 0, total: 100_000, cash: 100_000, promptPay: 0 };
  const pdf = await salesPdf({ from: new Date("2026-10-01T00:00:00Z"), to: new Date("2026-10-02T00:00:00Z"), sales, summary }, "m@test");
  const pages = pdf.toString("latin1").match(/\/Type \/Page\b(?!s)/g) ?? [];
  assert.equal(pages.length, 3); // ~38 rows under the summary, ~49 per later page
});
