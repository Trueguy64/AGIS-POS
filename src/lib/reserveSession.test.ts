// Run: node --test src/lib/reserveSession.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadSession, saveSession, type ReserveSession } from "./reserveSession.ts";

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }; };
const t0 = Date.parse("2026-10-09T10:00:00Z");
const quote = { quoteId: "q", itemId: "i", title: "Ring", priceTHB: 15782, depositTHB: 1578, currency: "THB", depositAmount: "1578.00", expiresAt: "2026-10-09T10:15:00Z" };
const base: ReserveSession = { messages: [{ role: "user", content: "a ring" }], quote, reservation: null, status: null };

test("a saved chat comes back after a refresh", () => {
  const s = mem();
  saveSession(s, base, t0);
  assert.deepEqual(loadSession(s, t0 + 60_000), base);
});

test("an expired quote is dropped unless it was already reserved", () => {
  const s = mem();
  saveSession(s, base, t0);
  assert.equal(loadSession(s, t0 + 20 * 60_000)?.quote, null);
  saveSession(s, { ...base, reservation: { reservationId: "r", paypalOrderId: "o", currency: "THB" }, status: "PENDING" }, t0);
  assert.equal(loadSession(s, t0 + 20 * 60_000)?.quote?.quoteId, "q");
});

test("a session older than the 48-hour hold, or unreadable, starts fresh", () => {
  const s = mem();
  saveSession(s, base, t0);
  assert.equal(loadSession(s, t0 + 49 * 3600_000), null);
  s.setItem("agis-reserve", "{not json");
  assert.equal(loadSession(s, t0), null);
});
