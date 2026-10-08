import { test } from "node:test";
import assert from "node:assert/strict";
import { createPayPal, toMinor, fromMinor } from "../src/paypal/client";

test("toMinor/fromMinor use integer math", () => {
  assert.equal(toMinor("350.00"), 35000);
  assert.equal(toMinor("0.10"), 10);
  assert.equal(toMinor("100"), 10000);
  assert.equal(toMinor("4493.5"), 449350);
  assert.throws(() => toMinor("1.234"));
  assert.throws(() => toMinor("abc"));
  assert.equal(fromMinor(35000), "350.00");
  assert.equal(fromMinor(10), "0.10");
});

type Call = { url: string; init: RequestInit };
function fakeFetch(handler: (c: Call) => Response | Promise<Response>) {
  const calls: Call[] = [];
  const f = (async (url: string, init: RequestInit = {}) => {
    const c = { url: String(url), init }; calls.push(c);
    if (c.url.endsWith("/v1/oauth2/token")) return Response.json({ access_token: "T", expires_in: 3600 });
    return handler(c);
  }) as unknown as typeof fetch;
  return { f, calls };
}
const completedOrder = { id: "O1", status: "COMPLETED", purchase_units: [{ payments: { captures: [{ status: "COMPLETED", amount: { currency_code: "THB", value: "4493.00" } }] } }] };

test("createOrder sends minor amount as string and request id", async () => {
  const { f, calls } = fakeFetch(() => Response.json({ id: "O1", status: "CREATED" }, { status: 201 }));
  const pp = createPayPal({ clientId: "c", secret: "s", fetch: f });
  const r = await pp.createOrder(449300, "THB", "create-R1");
  assert.deepEqual(r, { kind: "ok", value: { orderId: "O1" } });
  const body = JSON.parse(String(calls[1].init.body));
  assert.equal(body.purchase_units[0].amount.value, "4493.00");
  assert.equal((calls[1].init.headers as Record<string, string>)["PayPal-Request-Id"], "create-R1");
});

test("captureOrder parses capture status and amount", async () => {
  const { f } = fakeFetch(() => Response.json(completedOrder, { status: 201 }));
  const r = await createPayPal({ clientId: "c", secret: "s", fetch: f }).captureOrder("O1", "capture-R1");
  assert.deepEqual(r, { kind: "ok", value: { orderStatus: "COMPLETED", captureStatus: "COMPLETED", capturedMinor: 449300, currency: "THB" } });
});

test("4xx is refused with the issue; 404 is NOT_FOUND", async () => {
  const { f } = fakeFetch((c) => c.url.includes("/capture")
    ? Response.json({ name: "UNPROCESSABLE_ENTITY", details: [{ issue: "ORDER_ALREADY_CAPTURED" }] }, { status: 422 })
    : new Response("", { status: 404 }));
  const pp = createPayPal({ clientId: "c", secret: "s", fetch: f });
  assert.deepEqual(await pp.captureOrder("O1", "x"), { kind: "refused", status: 422, issue: "ORDER_ALREADY_CAPTURED" });
  assert.deepEqual(await pp.getOrder("O1"), { kind: "refused", status: 404, issue: "NOT_FOUND" });
});

test("5xx and timeouts are unknown", async () => {
  const { f } = fakeFetch(() => new Response("oops", { status: 503 }));
  assert.equal((await createPayPal({ clientId: "c", secret: "s", fetch: f }).getOrder("O1")).kind, "unknown");
  const slow = fakeFetch((c) => new Promise<Response>((_, rej) => c.init.signal?.addEventListener("abort", () => rej(new Error("aborted")))));
  const r = await createPayPal({ clientId: "c", secret: "s", fetch: slow.f, timeoutMs: 20 }).captureOrder("O1", "x");
  assert.equal(r.kind, "unknown");
});
