// server/test/agent.test.ts
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { freshDb, startApp } from "./helpers";
import { createModel, ModelUnavailable, type Block } from "../src/agent/model";
import { createAgent } from "../src/agent/agent";
import { trimToFirstUser } from "../src/routes/agent";

const { prisma } = await freshDb();

/** Model that replays a script of assistant turns. */
function scripted(turns: Block[][]) {
  const seen: unknown[] = [];
  const call = async (system: string, messages: unknown[]) => { seen.push(structuredClone({ system, messages })); const c = turns.shift() ?? [{ type: "text", text: "ok" }]; return { content: c, stop_reason: c.some((b) => b.type === "tool_use") ? "tool_use" : "end_turn" }; };
  return { call: call as never, seen };
}
const fakeRes = {
  quotePrice: async (itemId: string) => { if (itemId !== "I1") throw Object.assign(new Error("No such piece"), { code: "NOT_FOUND" }); return { quoteId: "Q1", itemId: "I1", title: "Chain", priceTHB: 44931, depositTHB: 4493, currency: "THB", depositAmount: "4493.00", expiresAt: "2026-11-01T10:15:00Z" }; },
  createReservation: async () => ({ reservationId: "R1", ref: "R-AAAAR1", paypalOrderId: "O1", currency: "THB" }),
  findByRef: async () => null,
  activeQuote: async (id: string) => (id === "Q1" ? { quoteId: "Q1", itemId: "I1", title: "Chain", priceTHB: 44931, depositTHB: 4493, currency: "THB", depositAmount: "4493.00", expiresAt: "2026-11-01T10:15:00Z" } : null),
  releaseExpired: async () => 0,
};
const search = async () => [];

test("model client retries once on 502 then throws ModelUnavailable; 4xx not retried", async () => {
  let n = 0;
  const f = (async () => { n++; return new Response("bad gateway", { status: 502 }); }) as unknown as typeof fetch;
  await assert.rejects(createModel({ baseUrl: "http://m", apiKey: "k", model: "m", fetch: f })("s", [], []), ModelUnavailable);
  assert.equal(n, 2);
  n = 0;
  const f4 = (async () => { n++; return new Response("{}", { status: 400 }); }) as unknown as typeof fetch;
  await assert.rejects(createModel({ baseUrl: "http://m", apiKey: "k", model: "m", fetch: f4 })("s", [], []), ModelUnavailable);
  assert.equal(n, 1);
});

test("quote result is returned structurally, not parsed from text", async () => {
  const m = scripted([[{ type: "tool_use", id: "t1", name: "quotePrice", input: { itemId: "I1" } }], [{ type: "text", text: "Here is your quote." }]]);
  const r = await createAgent({ call: m.call, reservations: fakeRes, searchCatalog: search }).chat({ messages: [{ role: "user", content: "quote I1" }] });
  assert.equal(r.reply, "Here is your quote.");
  assert.equal(r.quote?.quoteId, "Q1");
});

test("activeQuoteId is injected so a later turn can reserve; used/expired id ignored", async () => {
  const m = scripted([[{ type: "tool_use", id: "t1", name: "createReservation", input: { quoteId: "Q1", customerName: "Ann", contact: "a@x.com" } }], [{ type: "text", text: "Reserved." }]]);
  const r = await createAgent({ call: m.call, reservations: fakeRes, searchCatalog: search }).chat({ messages: [{ role: "user", content: "I'm Ann, a@x.com" }], activeQuoteId: "Q1", clientIp: "1.1.1.1" });
  assert.equal(r.reservation?.paypalOrderId, "O1");
  assert.match(JSON.stringify(m.seen[0]), /Active quote Q1/);
  const m2 = scripted([[{ type: "text", text: "hi" }]]);
  await createAgent({ call: m2.call, reservations: fakeRes, searchCatalog: search }).chat({ messages: [{ role: "user", content: "hi" }], activeQuoteId: "OLD" });
  assert.doesNotMatch(JSON.stringify(m2.seen[0]), /Active quote/);
});

test("second createReservation in one turn refused; tool loop capped at 5", async () => {
  let made = 0;
  const res = { ...fakeRes, createReservation: async () => { made++; return { reservationId: "R1", ref: "R-AAAAR1", paypalOrderId: "O1", currency: "THB" }; } };
  const twice: Block = { type: "tool_use", id: "a", name: "createReservation", input: { quoteId: "Q1", customerName: "A", contact: "a@x.com" } };
  const m = scripted([[twice, { ...twice, id: "b" } as Block], [{ type: "text", text: "done" }]]);
  await createAgent({ call: m.call, reservations: res, searchCatalog: search }).chat({ messages: [{ role: "user", content: "x" }] });
  assert.equal(made, 1);
  const loop = scripted(Array.from({ length: 10 }, (_, i) => [{ type: "tool_use", id: `l${i}`, name: "searchCatalog", input: { query: "x" } } as Block]));
  const r = await createAgent({ call: loop.call, reservations: fakeRes, searchCatalog: search }).chat({ messages: [{ role: "user", content: "x" }] });
  assert.ok(loop.seen.length <= 6);
  assert.equal(typeof r.reply, "string");
});

test("bad tool input becomes a tool error, not an exception (Review Focus 5)", async () => {
  const m = scripted([[{ type: "tool_use", id: "t1", name: "quotePrice", input: { itemId: "NOPE" } }], [{ type: "text", text: "Sorry, I couldn't find that piece." }]]);
  const r = await createAgent({ call: m.call, reservations: fakeRes, searchCatalog: search }).chat({ messages: [{ role: "user", content: "x" }] });
  assert.equal(r.quote, undefined);
  assert.match(JSON.stringify(m.seen[1]), /"is_error":true/);
});

test("HTTP contract: role tool / non-string content / too long / too many → 400; gateway down → friendly 503", async () => {
  process.env.AI_BASE_URL = "http://127.0.0.1:9"; // nothing listens: model unavailable
  const app = await startApp();
  after(() => app.close());
  const post = (body: object) => fetch(`${app.base}/api/agent/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  assert.equal((await post({ messages: [{ role: "tool", content: "x" }] })).status, 400);
  assert.equal((await post({ messages: [{ role: "user", content: [{ type: "tool_result" }] }] })).status, 400);
  assert.equal((await post({ messages: [{ role: "user", content: "x".repeat(1001) }] })).status, 400);
  assert.equal((await post({ messages: Array.from({ length: 21 }, () => ({ role: "user", content: "x" })) })).status, 400);
  const down = await post({ messages: [{ role: "user", content: "hello" }] });
  assert.equal(down.status, 503);
  assert.match((await down.json()).message, /assistant is unavailable/i);
  assert.equal(await prisma.quote.count(), 0);
});

test("trimToFirstUser drops a leading assistant greeting; all-assistant → empty", () => {
  assert.deepEqual(trimToFirstUser([
    { role: "assistant", content: "Hi! How can I help?" },
    { role: "assistant", content: "Boo." },
    { role: "user", content: "quote I1" },
    { role: "assistant", content: "ok" },
  ]), [{ role: "user", content: "quote I1" }, { role: "assistant", content: "ok" }]);
  assert.deepEqual(trimToFirstUser([{ role: "assistant", content: "x" }]), []);
});

test("HTTP chat: no user message at all → 400 Invalid chat request", async () => {
  const app = await startApp();
  after(() => app.close());
  const r = await fetch(`${app.base}/api/agent/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "assistant", content: "Hello?" }] }),
  });
  assert.equal(r.status, 400);
  assert.match((await r.json()).message, /Invalid chat request/i);
});

test("an unknown itemId tells the model to search again for the real id", async () => {
  const m = scripted([[{ type: "tool_use", id: "t1", name: "quotePrice", input: { itemId: "BAR-1B-965" } }], [{ type: "text", text: "Let me look that up." }]]);
  await createAgent({ call: m.call, reservations: fakeRes, searchCatalog: search }).chat({ messages: [{ role: "user", content: "Number 1" }] });
  const toolResult = JSON.stringify((m.seen[1] as { messages: unknown[] }).messages.at(-1));
  assert.match(toolResult, /searchCatalog/);
});

test("only one quote per message, so the page and the model agree on the active quote", async () => {
  let quoted = 0;
  const res = { ...fakeRes, quotePrice: async (id: string) => { quoted++; return fakeRes.quotePrice(id); } };
  const q: Block = { type: "tool_use", id: "a", name: "quotePrice", input: { itemId: "I1" } };
  const m = scripted([[q, { ...q, id: "b" } as Block], [{ type: "text", text: "Here you go." }]]);
  await createAgent({ call: m.call, reservations: res, searchCatalog: search }).chat({ messages: [{ role: "user", content: "quote both" }] });
  assert.equal(quoted, 1);
});

test("the prompt forbids claiming a reservation that the tool did not make", async () => {
  const m = scripted([[{ type: "text", text: "hi" }]]);
  await createAgent({ call: m.call, reservations: fakeRes, searchCatalog: search }).chat({ messages: [{ role: "user", content: "hi" }] });
  assert.match((m.seen[0] as { system: string }).system, /only after createReservation succeeds/i);
});

test("a failed quote does not use up the message's one quote", async () => {
  const m = scripted([
    [{ type: "tool_use", id: "a", name: "quotePrice", input: { itemId: "BAD" } }],
    [{ type: "tool_use", id: "b", name: "quotePrice", input: { itemId: "I1" } }],
    [{ type: "text", text: "Here is your quote." }],
  ]);
  const r = await createAgent({ call: m.call, reservations: fakeRes, searchCatalog: search }).chat({ messages: [{ role: "user", content: "the chain" }] });
  assert.equal(r.quote?.quoteId, "Q1");
});

test("the prompt keeps replies to plain text without links (the page shows its own PayPal button)", async () => {
  const m = scripted([[{ type: "text", text: "hi" }]]);
  await createAgent({ call: m.call, reservations: fakeRes, searchCatalog: search }).chat({ messages: [{ role: "user", content: "hi" }] });
  assert.match((m.seen[0] as { system: string }).system, /never write links or URLs/i);
});

test("a customer can look up their reservation by reference", async () => {
  let asked = "";
  const res = { ...fakeRes, findByRef: async (ref: string) => { asked = ref; return { ref: "R-ABC123", item: "Chain", status: "PAID", heldUntil: "2026-11-03T10:00:00Z", priceTHB: 44931, depositTHB: 4493, balanceTHB: 40438 }; } };
  const m = scripted([[{ type: "tool_use", id: "t1", name: "findReservation", input: { ref: "R-ABC123" } }], [{ type: "text", text: "Your chain is held." }]]);
  const r = await createAgent({ call: m.call, reservations: res, searchCatalog: search }).chat({ messages: [{ role: "user", content: "status of R-ABC123?" }] });
  assert.equal(asked, "R-ABC123");
  assert.match(JSON.stringify((m.seen[1] as { messages: unknown[] }).messages.at(-1)), /40438/);
  assert.equal(r.reply, "Your chain is held.");
});
