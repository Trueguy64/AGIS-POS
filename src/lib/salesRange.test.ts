// Run: node --test src/lib/salesRange.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { toRange } from "./salesRange.ts";

test("one local day becomes [midnight, next midnight)", () => {
  const r = toRange("2026-10-09", "2026-10-09");
  assert.ok(r);
  assert.equal(new Date(r[1]).getTime() - new Date(r[0]).getTime(), 24 * 3600_000);
});

test("empty, backwards and five-digit-year inputs are invalid instead of throwing", () => {
  assert.equal(toRange("", "2026-10-09"), null);
  assert.equal(toRange("2026-10-10", "2026-10-09"), null);
  assert.equal(toRange("2026-10-09", "20262-01-01"), null);
});
