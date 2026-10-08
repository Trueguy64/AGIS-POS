// server/test/reservation-routes.test.ts
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { freshDb, startApp, authCookie } from "./helpers";

process.env.PAYPAL_CLIENT_ID = "client-123";
process.env.PAYPAL_CURRENCY = "THB";
const { prisma } = await freshDb();
const app = await startApp();
after(() => app.close());

test("config is public and exposes only the client id and currency", async () => {
  const r = await fetch(`${app.base}/api/reservation/config`);
  assert.deepEqual(await r.json(), { paypalClientId: "client-123", currency: "THB" });
});

test("staff list requires login; capture of unknown id is 404; body is ignored", async () => {
  assert.equal((await fetch(`${app.base}/api/reservation`)).status, 401);
  const res = await fetch(`${app.base}/api/reservation/nope/capture`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ orderId: "EVIL" }) });
  assert.equal(res.status, 404);
  const list = await fetch(`${app.base}/api/reservation`, { headers: { cookie: authCookie() } });
  assert.equal(list.status, 200);
  assert.deepEqual(await list.json(), []);
});

test("accept/cancel require Manager", async () => {
  const r = await fetch(`${app.base}/api/reservation/x/accept`, { method: "POST", headers: { cookie: authCookie({ role: "Employee" }) } });
  assert.equal(r.status, 403);
});

test("rate limiter returns 429 after max", async () => {
  const { rateLimit } = await import("../src/lib/rateLimit");
  const mw = rateLimit({ windowMs: 60_000, max: 2 });
  let status = 0;
  const res = { status(s: number) { status = s; return this; }, json() { return this; } } as never;
  const req = { ip: "5.5.5.5" } as never;
  let passed = 0;
  for (let i = 0; i < 3; i++) mw(req, res, () => { passed++; });
  assert.equal(passed, 2);
  assert.equal(status, 429);
  void prisma;
});
