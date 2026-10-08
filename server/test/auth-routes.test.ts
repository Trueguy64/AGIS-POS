// server/test/auth-routes.test.ts
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { startApp } from "./helpers";

const prev = process.env.NODE_ENV;
process.env.NODE_ENV = "production";
const app = await startApp();
after(async () => { await app.close(); if (prev === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = prev; });

test("POST /api/auth/register is disabled when NODE_ENV=production", async () => {
  const r = await fetch(`${app.base}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "x", email: "x@x.com", phone: "1", password: "pwpwpwpw", role: "Employee" }),
  });
  assert.equal(r.status, 403);
  assert.deepEqual(await r.json(), { message: "Registration is disabled on the demo" });
});
