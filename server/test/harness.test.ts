// server/test/harness.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { freshDb } from "./helpers";
import { withSqliteRetry } from "../src/lib/sqliteRetry";

const { prisma } = await freshDb();

test("loadEnv does not override DATABASE_URL set by the test", () => {
  assert.match(process.env.DATABASE_URL!, /agis-/);
});

test("two concurrent interactive transactions both complete (probe)", async () => {
  const cat = await prisma.category.create({ data: { name: "Probe", symbol: "x" } });
  const run = (n: number) => withSqliteRetry(() => prisma.$transaction(async (tx) => {
    const c = await tx.category.findUniqueOrThrow({ where: { id: cat.id } });
    await new Promise((r) => setTimeout(r, 20));
    await tx.category.update({ where: { id: c.id }, data: { symbol: `${c.symbol}${n}` } });
  }));
  await Promise.all([run(1), run(2)]);
  const after = await prisma.category.findUniqueOrThrow({ where: { id: cat.id } });
  assert.equal(after.symbol.length, 3, `symbol was ${after.symbol}; if 2, transactions interleaved and lost an update`);
});
