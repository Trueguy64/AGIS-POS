# Agentic Reservations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A remote customer chats with an AI agent on `/reserve`, gets a live-rate quote for an AGIS catalog piece, pays a 10% PayPal sandbox deposit that holds the piece and price for 48 h, and staff collect the balance in AGIS.

**Architecture:** Three new server modules — `paypal/` (Orders v2 REST client), `reservations/` (quotes, holds, capture state machine; all money rules), `agent/` (tool-calling loop against an Anthropic-format Messages endpoint served by MiniMax). The existing `sale` route gains a collection endpoint and hold-aware stock checks. Two new React pages: public `/reserve` and staff `/reservations`.

**Tech Stack:** Express 5, Prisma 7 + `@prisma/adapter-better-sqlite3` (SQLite), zod 4, React 19 + Vite + Tailwind 4, PayPal Orders v2 REST + JS SDK (sandbox), MiniMax `minimax-m3` via its Anthropic-compatible `/v1/messages`, Node 24 `node:test` + `tsx` for tests.

**Spec:** `docs/superpowers/specs/2026-10-08-agentic-reservations-design.md` (rev 4, approved). Read it before any task; section numbers below (§4.3 etc.) refer to it.

## Global Constraints

- No new runtime dependencies on the server or client. The model client and PayPal client are plain `fetch`. (The spec's "Anthropic SDK" is replaced by a 40-line `fetch` client against the same Messages API so tests can inject `fetch`; behaviour is identical.)
- Server amounts are integers. Prices are whole baht (existing `unitPrice` rounds to baht). Quote columns store satang (`priceSatang = priceBaht * 100`). The deposit is rounded once, to whole baht, at quote time: `depositSatang = Math.round(priceBaht * DEPOSIT_PERCENT / 100) * 100`, so the counter balance is whole baht.
- PayPal amount strings are converted with integer math only (`toMinor` / `fromMinor`, Task 3). Never `parseFloat` a money string.
- **Zero-row rule:** inside an interactive `prisma.$transaction`, every conditional `updateMany` whose `count !== 1` must `throw`, so earlier writes in the same transaction roll back. Outside a transaction, a zero-row conditional update means "someone else won": reload and return.
- Every change of `Item.held` happens in the same transaction as the conditional status update that justifies it, and only when that update changed exactly one row.
- `reservations/` never calls `new Date()` or `Date.now()`; it uses the injected `now()`. Times written by Prisma defaults (`createdAt`, `updatedAt`) are never used in logic; the capture claim time is the explicit `claimedAt` column.
- Env (spec §3 Settings): `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` (default `minimax-m3`), `PAYPAL_CLIENT_ID`, `PAYPAL_SECRET`, `PAYPAL_BASE` (default `https://api-m.sandbox.paypal.com`), `PAYPAL_CURRENCY` (default `THB`), `DEPOSIT_PERCENT` (10), `QUOTE_MINUTES` (15), `PENDING_MINUTES` (30; hosted demo 10), `HOLD_MINUTES` (2880), `CAPTURE_STALE_SECONDS` (60). PayPal HTTP timeout 20 s; model HTTP timeout 30 s.
- Chat caps: ≤ 20 messages, each ≤ 1,000 chars, roles `user`/`assistant` with string content only; ≤ 5 tool calls per turn; ≤ 1 `createReservation` per turn; ≤ 2 `PENDING`/`CAPTURING` reservations per client IP; rate limit 20 chat requests per IP per 10 minutes; `app.set("trust proxy", 1)`.
- Customer-facing copy on `/reserve` is English only. Staff pages use the existing `Bi` / `S` table for any new label; new Thai strings get a trailing comment `// Thai pending native-speaker review`.
- Test command (from `server/`): `npm test`. Every task ends with `npm test` green, plus `npx tsc --noEmit` in `server/`; tasks touching `src/` also run `npx tsc -b && npx eslint . && npm run build` from the repo root.
- Work on branch `redesign-loop` (or a branch off it). Commit at the end of every task.
- **Checkpoint (spec §7):** by the end of Task 10 (~hour 20) the happy path runs end to end on Render. Cut order if late: Task 10 step "editor held display" → Task 10 step "till Reserved badge" → Task 9 step "polling". Never cut tests in Tasks 4–7.

## Review Focus

1. Gold rate feed down when a customer asks for a quote → `quotePrice` refuses with `RATE_UNAVAILABLE`, writes no `Quote`, and the agent says it cannot price right now. Test in Task 4.
2. Empty, whitespace-only or 5,000-character customer name/contact → `createReservation` refuses with `INVALID_CUSTOMER` (name 1–100 chars trimmed, contact 3–200 chars trimmed) before claiming stock. Test in Task 4.
3. Two browser tabs reserve with the same quote at the same moment → exactly one reservation; the other gets `QUOTE_USED`; `held` incremented once (the unique `quoteId` rolls back the loser's claim). Test in Task 4.
4. Manager deletes an item that has reservation history (collected/cancelled) or open quotes → delete refused with 409 (history) or quotes removed by cascade, never a 500 from a foreign-key error. Test in Task 7.
5. Model calls a tool with a non-existent `itemId` or a garbage `quoteId` → tool returns an error result to the model, the turn completes with a normal reply, no exception escapes. Test in Task 8.

---

## File Structure

**Server (`server/`)**

| File | Responsibility |
|---|---|
| `src/env.ts` (new) | `loadEnv()`: read `.env` if present, never override existing vars, never throw when missing. |
| `src/db.ts` (modify) | Use `loadEnv()`; set SQLite busy timeout. |
| `prisma.config.ts` (modify) | Use `loadEnv()`. |
| `src/app.ts` (new) | `createApp()`: all middleware and routers; no `listen`. |
| `src/index.ts` (modify) | `createApp().listen(PORT)`; in production serve `../dist`. |
| `src/lib/pricing.ts` (new) | `unitPrice()` moved from `routes/sale.ts`. |
| `src/lib/goldRate.ts` (new) | `getGoldRate()` with the 60 s cache, moved from `routes/gold.ts`. |
| `src/lib/sqliteRetry.ts` (new) | `withSqliteRetry(fn)` for busy/locked errors. |
| `src/lib/rateLimit.ts` (new) | In-memory fixed-window limiter middleware. |
| `src/paypal/client.ts` (new) | `createPayPal()`, `toMinor()`, `fromMinor()`, types `OrderInfo`, `PayPalResult`, `PayPal`. |
| `src/reservations/service.ts` (new) | `createReservations(deps)`: `quotePrice`, `createReservation`, `releaseExpired`, `captureReservation`, `acceptReview`, `cancelReview`, `list`. `ReservationError`, `configFromEnv()`. |
| `src/reservations/index.ts` (new) | The default instance wired to real prisma, PayPal, clock, rate. |
| `src/routes/reservation.ts` (new) | `/api/reservation/*` HTTP routes. |
| `src/agent/model.ts` (new) | `createModel()`: Messages API call with one retry. |
| `src/agent/agent.ts` (new) | `createAgent()`: system prompt, tools, loop, structured result. |
| `src/routes/agent.ts` (new) | `POST /api/agent/chat`: validation, caps, rate limit. |
| `src/routes/sale.ts` (modify) | Hold-aware stock check; `POST /api/sale/collect`. |
| `src/routes/gold.ts` (modify) | Use `getGoldRate()`. |
| `src/controllers/ItemController.ts` (modify) | Refuse stock below `held`; refuse delete with holds or history. |
| `src/prisma/schema.prisma` (modify) + migration | `Item.held`, `Quote`, `Reservation`, `Sale.depositPaid`. |
| `src/prisma/seed.ts` (modify) | Optional demo staff user from env. |
| `scripts/paypal-check.ts`, `scripts/ai-ping-server.ts` (new) | Day-1 checks (kept in repo as documentation). |
| `test/helpers.ts` (new) | Fresh migrated SQLite DB per test file, fake clock, fake PayPal, auth cookie. |
| `test/*.test.ts` (new) | Tests per task. |

**Client (`src/`)**

| File | Responsibility |
|---|---|
| `src/api/reservation.ts` (new) | Typed calls for chat, capture, config, staff actions, collect. |
| `src/pages/ReservePage.tsx` (new) | Public chat + quote card + PayPal button + result states. |
| `src/components/reserve/PayPalButton.tsx` (new) | Loads the JS SDK with matching `currency=`, renders Buttons for a given order. |
| `src/pages/ReservationsPage.tsx` (new) | Staff list, Check payment, Collect, Accept/Cancel review. |
| `src/components/reservations/CollectDialog.tsx` (new) | Cash or PromptPay balance collection via `POST /api/sale/collect`. |
| `src/routes/AppRouter.tsx` (modify) | `/reserve` public, `/reservations` protected. |
| `src/types/types.ts` (modify) | `Item.held`, `Sale.depositPaid`. |
| `src/components/mainWeb/itemCard.tsx`, `buyItemOverlay.tsx` (modify) | Reserved badge, available units. |

---

### Task 0: Day-1 checks (manual, ~2 h)

These can change the design; do them before any other task. Record results in `docs/hackathon/day1.md` and commit.

**Files:**
- Create: `server/scripts/paypal-check.ts`, `server/scripts/ai-ping-server.ts`, `docs/hackathon/day1.md`

- [ ] **Step 1: Create PayPal sandbox apps.** In developer.paypal.com → Sandbox → Apps & Credentials, create an app; note Client ID and Secret. In Sandbox → Accounts note the default Business account country and one Personal (buyer) account email/password.

- [ ] **Step 2: Write the PayPal check script**

```ts
// server/scripts/paypal-check.ts — run: PAYPAL_CLIENT_ID=.. PAYPAL_SECRET=.. CURRENCY=THB npx tsx scripts/paypal-check.ts
const base = process.env.PAYPAL_BASE ?? "https://api-m.sandbox.paypal.com";
const currency = process.env.CURRENCY ?? "THB";
const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`).toString("base64");
const tok = await (await fetch(`${base}/v1/oauth2/token`, { method: "POST", headers: { authorization: `Basic ${auth}`, "content-type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials" })).json();
const h = { authorization: `Bearer ${tok.access_token}`, "content-type": "application/json" };
const order = await (await fetch(`${base}/v2/checkout/orders`, { method: "POST", headers: h, body: JSON.stringify({ intent: "CAPTURE", purchase_units: [{ amount: { currency_code: currency, value: "100.00" } }] }) })).json();
console.log("order", order.id, order.status, (order.links ?? []).find((l: { rel: string }) => l.rel === "approve")?.href);
console.log("Open the approve link, log in as the sandbox BUYER, approve, then press Enter.");
await new Promise((r) => process.stdin.once("data", r));
const cap = await (await fetch(`${base}/v2/checkout/orders/${order.id}/capture`, { method: "POST", headers: { ...h, "PayPal-Request-Id": `check-${order.id}` } })).json();
const c = cap.purchase_units?.[0]?.payments?.captures?.[0];
console.log("order status:", cap.status, "capture status:", c?.status, "reason:", c?.status_details?.reason, "amount:", c?.amount);
process.exit(0);
```

- [ ] **Step 3: Run it with `CURRENCY=THB`.** Expected for a pass: `capture status: COMPLETED`, amount `{ currency_code: "THB", value: "100.00" }`. If the capture status is `PENDING` (e.g. reason `RECEIVING_PREFERENCE_MANDATES_MANUAL_ACTION`) or creation fails, run again with `CURRENCY=USD`; if USD passes, set `PAYPAL_CURRENCY=USD` for the project (Task 4 converts at quote time).

- [ ] **Step 4: Write the AI ping server**

```ts
// server/scripts/ai-ping-server.ts — deploy as a throwaway Render web service.
// Start command: npx tsx scripts/ai-ping-server.ts   Env: AI_BASE_URL, AI_API_KEY, AI_MODEL
import { createServer } from "node:http";
createServer(async (_req, res) => {
  try {
    const r = await fetch(`${process.env.AI_BASE_URL}/v1/messages`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": process.env.AI_API_KEY!, authorization: `Bearer ${process.env.AI_API_KEY}`, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: process.env.AI_MODEL ?? "minimax-m3", max_tokens: 32, messages: [{ role: "user", content: "Reply with the word OK." }] }),
      signal: AbortSignal.timeout(30_000),
    });
    res.writeHead(200, { "content-type": "text/plain" }).end(`${r.status} ${await r.text()}`);
  } catch (e) {
    res.writeHead(500).end(String(e));
  }
}).listen(Number(process.env.PORT ?? 3001));
```

- [ ] **Step 5: Deploy it to Render** (New → Web Service → this repo, root `server`, build `npm ci`, start `npx tsx scripts/ai-ping-server.ts`, env `AI_BASE_URL=https://nrrai2-model.sit.kmutt.ac.th/api`, `AI_API_KEY`, `AI_MODEL=minimax-m3`). Open its URL. Pass: `200 {...OK...}`. Fail (timeout, 403, connection refused): the hosted demo needs another provider; record it and ask the user before continuing. Delete the Render service afterwards. Also note Render's current free-tier limits (sleep, disk) in `day1.md`.

- [ ] **Step 6: Read PayPal Agent Toolkit docs.** Record in `day1.md` whether its order tools accept our server-side amount, our `PayPal-Request-Id`, and expose capture status and amount. If yes for all three, Task 3 may wrap it behind the same `PayPal` interface; otherwise use the `fetch` client as written.

- [ ] **Step 7: Commit**

```bash
git add server/scripts docs/hackathon/day1.md
git commit -m "chore: day-1 checks (PayPal sandbox currency, MiniMax from Render)"
```

---

### Task 1: Test harness, env loading, app split, SQLite concurrency probe

**Files:**
- Create: `server/src/env.ts`, `server/src/app.ts`, `server/src/lib/sqliteRetry.ts`, `server/test/helpers.ts`, `server/test/harness.test.ts`
- Modify: `server/src/db.ts`, `server/prisma.config.ts`, `server/src/index.ts`, `server/package.json`

**Interfaces:**
- Produces: `loadEnv(): void`; `createApp(): express.Express`; `withSqliteRetry<T>(fn: () => Promise<T>): Promise<T>`; test helpers `freshDb(): Promise<{ prisma: PrismaClient; url: string }>`, `fakeClock(start?: string): { now: () => Date; advance(ms: number): void; set(iso: string): void }`, `authCookie(user?: Partial<JwtPayload>): string`, `startApp(): Promise<{ base: string; close(): Promise<void> }>`.

- [ ] **Step 1: `src/env.ts`**

```ts
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";

/** Load ./.env if it exists. Never overrides variables already set (tests, Render). Never throws when the file is missing. */
export function loadEnv(file = ".env") {
  let text: string;
  try { text = readFileSync(file, "utf8"); } catch { return; }
  for (const [k, v] of Object.entries(parseEnv(text))) if (process.env[k] === undefined) process.env[k] = v;
}
```

- [ ] **Step 2: Use it in `prisma.config.ts` and `src/db.ts`.** Replace `process.loadEnvFile();` in both with `loadEnv();` (import from `./src/env` and `./env` respectively). In `db.ts` also apply the busy timeout: check `node_modules/@prisma/adapter-better-sqlite3/dist/index.d.ts` for a `timeout` option on the adapter config; if present pass `timeout: 5000`, otherwise after creating the client run `await prisma.$executeRawUnsafe("PRAGMA busy_timeout = 5000")` in a top-level `void` call. Write which one you used as a one-line comment.

- [ ] **Step 3: Split the app.** Create `src/app.ts` containing everything currently in `src/index.ts` except `app.listen`, exported as:

```ts
export function createApp() {
  const app = express();
  app.set("trust proxy", 1); // Render's proxy: req.ip is the client, not the proxy
  // ...existing use() lines unchanged...
  return app;
}
```

and reduce `src/index.ts` to:

```ts
import { createApp } from "./app";
const PORT = process.env.PORT ?? 3000;
createApp().listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
```

- [ ] **Step 4: `src/lib/sqliteRetry.ts`**

```ts
const BUSY = /SQLITE_BUSY|database is locked|P2034|Transaction already closed|timed out/i;

/** Retry a write that lost a SQLite lock race. After 3 tries, rethrow with status 409 so routes answer "try again". */
export async function withSqliteRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let i = 0; ; i++) {
    try { return await fn(); }
    catch (e) {
      const msg = `${(e as { code?: string }).code ?? ""} ${(e as Error).message ?? ""}`;
      if (!BUSY.test(msg)) throw e;
      if (i === 2) throw Object.assign(new Error("Busy, please try again"), { status: 409 });
      await new Promise((r) => setTimeout(r, 25 * (i + 1)));
    }
  }
}
```

- [ ] **Step 5: `test/helpers.ts`**

```ts
import { execSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import jwt from "jsonwebtoken";
import type { AddressInfo } from "node:net";

process.env.JWT_SECRET ??= "test-secret";

/** One migrated SQLite file per test file. Sets DATABASE_URL before anything imports src/db. */
export async function freshDb() {
  const url = "file:" + join(mkdtempSync(join(tmpdir(), "agis-")), "test.db");
  process.env.DATABASE_URL = url;
  execSync("npx prisma migrate deploy", { cwd: join(import.meta.dirname, ".."), env: { ...process.env, DATABASE_URL: url }, stdio: "ignore" });
  const { prisma } = await import("../src/db");
  return { prisma, url };
}

export function fakeClock(start = "2026-11-01T10:00:00.000Z") {
  let t = new Date(start).getTime();
  return { now: () => new Date(t), advance: (ms: number) => { t += ms; }, set: (iso: string) => { t = new Date(iso).getTime(); } };
}

export function authCookie(user: { id?: number; email?: string; role?: "Manager" | "Employee" } = {}) {
  const token = jwt.sign({ id: user.id ?? 1, email: user.email ?? "staff@test", role: user.role ?? "Manager" }, process.env.JWT_SECRET!);
  return `token=${token}`;
}

export async function startApp() {
  const { createApp } = await import("../src/app");
  const server = createApp().listen(0);
  await new Promise((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { base, close: () => new Promise<void>((r) => server.close(() => r())) };
}
```

- [ ] **Step 6: Add the test script** to `server/package.json` scripts: `"test": "node --import tsx --test --test-concurrency=1 \"test/**/*.test.ts\""`.

- [ ] **Step 7: Write the harness + concurrency probe test**

```ts
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
```

- [ ] **Step 8: Run** `cd server && npm test`. Expected: both pass. If the probe fails with a busy/timeout error even through `withSqliteRetry`, raise the interactive-transaction timeout (`prisma.$transaction(fn, { timeout: 10000, maxWait: 10000 })`) and rerun; if it fails with `symbol.length === 2`, interactive transactions on this adapter are not isolated — stop and report, because Tasks 4–7 rely on them. Record the observed behaviour (serialised / retried / timeout) as a comment at the top of `sqliteRetry.ts`.

- [ ] **Step 9: Verify the dev server still runs**: `npm run dev` in `server/`, `curl http://localhost:3000/api/gold` returns JSON. Stop it.

- [ ] **Step 10: Commit**

```bash
git add server/src/env.ts server/src/app.ts server/src/index.ts server/src/db.ts server/prisma.config.ts server/src/lib/sqliteRetry.ts server/test server/package.json
git commit -m "test: node:test harness, env loading without override, app factory, SQLite concurrency probe"
```

---

### Task 2: Schema, shared pricing and gold rate

**Files:**
- Modify: `server/src/prisma/schema.prisma`, `server/src/routes/sale.ts`, `server/src/routes/gold.ts`
- Create: `server/src/lib/pricing.ts`, `server/src/lib/goldRate.ts`, migration folder, `server/test/schema.test.ts`

**Interfaces:**
- Produces: `unitPrice(weight: number, purity: number, laborFee: number, thbPerGram: number): number` (whole baht); `getGoldRate(): Promise<GoldRate>` where `GoldRate = { usdPerOunce: number; usdToThb: number; thbPerGram: number; updatedAt: string }`; Prisma models `Quote`, `Reservation`, `Item.held`, `Sale.depositPaid`.

- [ ] **Step 1: Write the failing schema test**

```ts
// server/test/schema.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { freshDb } from "./helpers";

const { prisma } = await freshDb();

test("reservation schema: held counter, quote, reservation, sale deposit", async () => {
  const item = await prisma.item.create({ data: { title: "T", image: "x", weight: 15.244, purity: 0.965, laborFee: 800, stock: 1 } });
  assert.equal(item.held, 0);
  const q = await prisma.quote.create({ data: { itemId: item.id, goldRate: 3000, priceSatang: 4_493_000, depositSatang: 449_300, currency: "THB", depositMinor: 449_300, expiresAt: new Date() } });
  const r = await prisma.reservation.create({ data: { quoteId: q.id, itemId: item.id, customerName: "A", contact: "a@b.c", status: "PENDING", heldUntil: new Date() } });
  assert.equal(r.claimedAt, null);
  await assert.rejects(prisma.reservation.create({ data: { quoteId: q.id, itemId: item.id, customerName: "B", contact: "b@b.c", status: "PENDING", heldUntil: new Date() } }), /Unique constraint/);
  const claim = await prisma.item.updateMany({ where: { id: item.id, stock: { gt: prisma.item.fields.held } }, data: { held: { increment: 1 } } });
  assert.equal(claim.count, 1);
  const again = await prisma.item.updateMany({ where: { id: item.id, stock: { gt: prisma.item.fields.held } }, data: { held: { increment: 1 } } });
  assert.equal(again.count, 0, "field-reference claim must refuse when stock == held");
});
```

- [ ] **Step 2: Run it.** `npm test` → FAIL (`held` / `quote` do not exist).

- [ ] **Step 3: Edit `schema.prisma`.** Add to `model Item`: `held Int @default(0)`, `quotes Quote[]`, `reservations Reservation[]`. Add to `model Sale`: `depositPaid Int @default(0) // THB already paid via PayPal (collections)`. Add:

```prisma
model Quote {
  id            String       @id @default(cuid(2))
  itemId        String
  item          Item         @relation(fields: [itemId], references: [id], onDelete: Cascade)
  goldRate      Float
  priceSatang   Int
  depositSatang Int
  currency      String
  depositMinor  Int
  expiresAt     DateTime
  createdAt     DateTime     @default(now())
  reservation   Reservation?
}

model Reservation {
  id            String    @id @default(cuid(2))
  quoteId       String    @unique
  quote         Quote     @relation(fields: [quoteId], references: [id])
  itemId        String
  item          Item      @relation(fields: [itemId], references: [id], onDelete: Restrict)
  customerName  String
  contact       String
  clientIp      String?
  status        String    // PENDING | CAPTURING | PAID | REVIEW | COLLECTED | EXPIRED | CANCELLED
  paypalOrderId String?   @unique
  captureStatus String?
  capturedMinor Int?
  claimedAt     DateTime? // set from injected now() when CAPTURING is claimed; staleness is measured on this
  heldUntil     DateTime
  saleId        Int?      @unique
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
```

- [ ] **Step 4: Create the migration** with the non-interactive recipe (interactive `migrate dev` fails in this environment):

```bash
cd server
npx prisma migrate diff --from-config-datasource --to-schema src/prisma/schema.prisma --script > /tmp/m.sql
mkdir -p src/prisma/migrations/20261009000000_reservations && mv /tmp/m.sql src/prisma/migrations/20261009000000_reservations/migration.sql
npx prisma migrate deploy && npx prisma generate
```

Read `migration.sql` before deploying: expect `ALTER TABLE "Item" ADD COLUMN "held"`, `ALTER TABLE "Sale" ADD COLUMN "depositPaid"`, `CREATE TABLE "Quote"`, `CREATE TABLE "Reservation"` and unique indexes; nothing that drops data.

- [ ] **Step 5: Move pricing and rate.** Create `src/lib/pricing.ts`:

```ts
/** Whole-baht unit price. Same arithmetic as the client (src/lib/gold.ts). */
export const unitPrice = (weight: number, purity: number, laborFee: number, thbPerGram: number) =>
  Math.round(weight * purity * thbPerGram + laborFee);
```

Create `src/lib/goldRate.ts` by moving `GRAMS_PER_TROY_OUNCE`, `TTL_MS`, `GoldRate`, `cache` and `fetchRate` out of `routes/gold.ts`, plus:

```ts
/** Cached 60 s. On feed failure returns the last good rate; throws only when there has never been one. */
export async function getGoldRate(): Promise<GoldRate> {
  try {
    if (!cache || Date.now() - cache.at > TTL_MS) cache = { rate: await fetchRate(), at: Date.now() };
  } catch (err) {
    if (!cache) throw err;
    console.error("Gold rate fetch failed, serving cached:", err);
  }
  return cache.rate;
}
```

`routes/gold.ts` becomes a handler that returns `await getGoldRate()` or 502 on throw. In `routes/sale.ts` delete the local `unitPrice` and import it from `../lib/pricing`.

- [ ] **Step 6: Run** `npm test` → PASS. `npx tsc --noEmit` → clean.

- [ ] **Step 7: Commit**

```bash
git add server/src/prisma server/src/lib server/src/routes/gold.ts server/src/routes/sale.ts server/test/schema.test.ts
git commit -m "feat: reservation schema (held, Quote, Reservation, Sale.depositPaid), shared pricing and gold rate"
```

---

### Task 3: PayPal client

**Files:**
- Create: `server/src/paypal/client.ts`, `server/test/paypal.test.ts`

**Interfaces:**
- Produces:

```ts
export type OrderInfo = { orderStatus: string; captureStatus?: string; capturedMinor?: number; currency?: string };
export type PayPalResult<T> = { kind: "ok"; value: T } | { kind: "refused"; status: number; issue: string } | { kind: "unknown"; error: string };
export interface PayPal {
  createOrder(minor: number, currency: string, requestId: string): Promise<PayPalResult<{ orderId: string }>>;
  getOrder(orderId: string): Promise<PayPalResult<OrderInfo>>;
  captureOrder(orderId: string, requestId: string): Promise<PayPalResult<OrderInfo>>;
}
export function createPayPal(opts: { clientId: string; secret: string; base?: string; fetch?: typeof fetch; timeoutMs?: number }): PayPal;
export function toMinor(value: string): number;   // "350.00" → 35000
export function fromMinor(minor: number): string; // 35000 → "350.00"
```

Classification: HTTP 2xx → `ok`; 4xx → `refused` with `issue` = `details[0].issue` or `name` from the PayPal error body (404 → `issue: "NOT_FOUND"` if absent); 5xx, timeout, network error, unparsable body → `unknown`.

- [ ] **Step 1: Write the failing tests**

```ts
// server/test/paypal.test.ts
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
```

- [ ] **Step 2: Run** → FAIL (module missing).

- [ ] **Step 3: Implement `src/paypal/client.ts`**

```ts
export type OrderInfo = { orderStatus: string; captureStatus?: string; capturedMinor?: number; currency?: string };
export type PayPalResult<T> = { kind: "ok"; value: T } | { kind: "refused"; status: number; issue: string } | { kind: "unknown"; error: string };
export interface PayPal {
  createOrder(minor: number, currency: string, requestId: string): Promise<PayPalResult<{ orderId: string }>>;
  getOrder(orderId: string): Promise<PayPalResult<OrderInfo>>;
  captureOrder(orderId: string, requestId: string): Promise<PayPalResult<OrderInfo>>;
}

export function toMinor(value: string): number {
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!m) throw new Error(`Bad money string: ${value}`);
  return Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
}
export const fromMinor = (minor: number) => `${Math.trunc(minor / 100)}.${String(minor % 100).padStart(2, "0")}`;

type RawOrder = { id?: string; status?: string; purchase_units?: { payments?: { captures?: { status?: string; amount?: { currency_code?: string; value?: string } }[] } }[] };
const orderInfo = (o: RawOrder): OrderInfo => {
  const c = o.purchase_units?.[0]?.payments?.captures?.[0];
  return {
    orderStatus: o.status ?? "UNKNOWN",
    ...(c ? { captureStatus: c.status, capturedMinor: c.amount?.value ? toMinor(c.amount.value) : undefined, currency: c.amount?.currency_code } : {}),
  };
};

export function createPayPal(opts: { clientId: string; secret: string; base?: string; fetch?: typeof fetch; timeoutMs?: number }): PayPal {
  const base = opts.base ?? "https://api-m.sandbox.paypal.com";
  const f = opts.fetch ?? fetch;
  const timeoutMs = opts.timeoutMs ?? 20_000;
  let token: { value: string; until: number } | null = null;

  async function call<T>(method: string, path: string, body: unknown, headers: Record<string, string>, map: (j: unknown) => T): Promise<PayPalResult<T>> {
    try {
      if (!token || Date.now() > token.until) {
        const auth = Buffer.from(`${opts.clientId}:${opts.secret}`).toString("base64");
        const t = await f(`${base}/v1/oauth2/token`, { method: "POST", headers: { authorization: `Basic ${auth}`, "content-type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials", signal: AbortSignal.timeout(timeoutMs) });
        if (!t.ok) return t.status >= 500 ? { kind: "unknown", error: `token ${t.status}` } : { kind: "refused", status: t.status, issue: "AUTH_FAILED" };
        const j = (await t.json()) as { access_token: string; expires_in: number };
        token = { value: j.access_token, until: Date.now() + (j.expires_in - 60) * 1000 };
      }
      const res = await f(`${base}${path}`, {
        method, signal: AbortSignal.timeout(timeoutMs),
        headers: { authorization: `Bearer ${token.value}`, "content-type": "application/json", ...headers },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const text = await res.text();
      const json = text ? JSON.parse(text) : {};
      if (res.ok) return { kind: "ok", value: map(json) };
      if (res.status >= 500) return { kind: "unknown", error: `HTTP ${res.status}` };
      const issue = json?.details?.[0]?.issue ?? json?.name ?? (res.status === 404 ? "NOT_FOUND" : `HTTP_${res.status}`);
      return { kind: "refused", status: res.status, issue };
    } catch (e) {
      return { kind: "unknown", error: (e as Error).message };
    }
  }

  return {
    createOrder: (minor, currency, requestId) => call("POST", "/v2/checkout/orders",
      { intent: "CAPTURE", purchase_units: [{ amount: { currency_code: currency, value: fromMinor(minor) } }] },
      { "PayPal-Request-Id": requestId }, (j) => ({ orderId: (j as RawOrder).id! })),
    getOrder: (orderId) => call("GET", `/v2/checkout/orders/${orderId}`, undefined, {}, (j) => orderInfo(j as RawOrder)),
    captureOrder: (orderId, requestId) => call("POST", `/v2/checkout/orders/${orderId}/capture`, undefined, { "PayPal-Request-Id": requestId }, (j) => orderInfo(j as RawOrder)),
  };
}
```

- [ ] **Step 4: Run** → PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/paypal server/test/paypal.test.ts
git commit -m "feat: PayPal Orders v2 client with integer money parsing and refusal/unknown classification"
```

---

### Task 4: Reservations — quotes, claims, expiry

**Files:**
- Create: `server/src/reservations/service.ts`, `server/test/fakes.ts`, `server/test/reservations-claim.test.ts`

**Interfaces:**
- Consumes: `PayPal`, `OrderInfo` (Task 3); `unitPrice` (Task 2); `GoldRate` (Task 2).
- Produces (used by Tasks 5–8):

```ts
export type ReservationCode = "NOT_FOUND" | "QUOTE_EXPIRED" | "QUOTE_USED" | "UNAVAILABLE" | "IP_LIMIT" | "PAYPAL_UNAVAILABLE" | "RATE_UNAVAILABLE" | "INVALID_CUSTOMER" | "BAD_STATE";
export class ReservationError extends Error { constructor(public code: ReservationCode, message: string); }
export type Config = { depositPercent: number; quoteMinutes: number; pendingMinutes: number; holdMinutes: number; captureStaleSeconds: number; currency: "THB" | "USD"; maxPendingPerIp: number };
export function configFromEnv(env?: NodeJS.ProcessEnv): Config;
export type Deps = { prisma: PrismaClient; paypal: PayPal; now: () => Date; getRate: () => Promise<{ thbPerGram: number; usdToThb: number }>; config: Config };
export type QuoteCard = { quoteId: string; itemId: string; title: string; priceTHB: number; depositTHB: number; currency: string; depositAmount: string; expiresAt: string };
export function createReservations(deps: Deps): {
  quotePrice(itemId: string): Promise<QuoteCard>;
  createReservation(input: { quoteId: string; customerName: string; contact: string; clientIp?: string }): Promise<{ reservationId: string; paypalOrderId: string; currency: string }>;
  releaseExpired(): Promise<number>;
  activeQuote(quoteId: string): Promise<QuoteCard | null>; // null if unknown, expired or used
  captureReservation(id: string): Promise<Reservation>;    // Task 5
  acceptReview(id: string): Promise<Reservation>;          // Task 5
  cancelReview(id: string): Promise<Reservation>;          // Task 5
  list(): Promise<(Reservation & { item: Item; quote: Quote })[]>; // Task 5
};
```

- [ ] **Step 1: Test fakes**

```ts
// server/test/fakes.ts
import type { PayPal, PayPalResult, OrderInfo } from "../src/paypal/client";
import type { Config } from "../src/reservations/service";

export const config: Config = { depositPercent: 10, quoteMinutes: 15, pendingMinutes: 30, holdMinutes: 2880, captureStaleSeconds: 60, currency: "THB", maxPendingPerIp: 2 };
export const rate = async () => ({ thbPerGram: 3000, usdToThb: 36 });

/** Scriptable PayPal. Each method pops the next scripted result; defaults succeed. Records calls. */
export function fakePayPal() {
  const calls: { op: string; args: unknown[] }[] = [];
  const queue: Record<string, (() => Promise<PayPalResult<unknown>>)[]> = { createOrder: [], getOrder: [], captureOrder: [] };
  let n = 0;
  const paid = (minor: number, currency = "THB"): OrderInfo => ({ orderStatus: "COMPLETED", captureStatus: "COMPLETED", capturedMinor: minor, currency });
  const next = <T,>(op: string, dflt: () => PayPalResult<T>, args: unknown[]) => { calls.push({ op, args }); const q = queue[op].shift(); return (q ? q() : Promise.resolve(dflt())) as Promise<PayPalResult<T>>; };
  const pp: PayPal & { calls: typeof calls; script(op: keyof PayPal, ...rs: (() => Promise<PayPalResult<unknown>>)[]): void; lastMinor: number } = {
    calls, lastMinor: 0,
    script(op, ...rs) { queue[op].push(...rs); },
    createOrder(minor, currency, requestId) { pp.lastMinor = minor; return next("createOrder", () => ({ kind: "ok", value: { orderId: `O${++n}` } }), [minor, currency, requestId]); },
    getOrder(orderId) { return next("getOrder", () => ({ kind: "ok", value: paid(pp.lastMinor) }), [orderId]); },
    captureOrder(orderId, requestId) { return next("captureOrder", () => ({ kind: "ok", value: paid(pp.lastMinor) }), [orderId, requestId]); },
  };
  return { pp, paid };
}
```

- [ ] **Step 2: Write the failing tests**

```ts
// server/test/reservations-claim.test.ts
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { freshDb, fakeClock } from "./helpers";
import { config, rate, fakePayPal } from "./fakes";
import { createReservations, ReservationError } from "../src/reservations/service";

const { prisma } = await freshDb();
let clock: ReturnType<typeof fakeClock>, fake: ReturnType<typeof fakePayPal>, svc: ReturnType<typeof createReservations>, itemId: string;

beforeEach(async () => {
  await prisma.reservation.deleteMany(); await prisma.quote.deleteMany(); await prisma.item.deleteMany();
  clock = fakeClock(); fake = fakePayPal();
  svc = createReservations({ prisma, paypal: fake.pp, now: clock.now, getRate: rate, config });
  itemId = (await prisma.item.create({ data: { title: "Chain 1 Baht", image: "x", weight: 15.244, purity: 0.965, laborFee: 800, stock: 1 } })).id;
});
const code = (c: string) => (e: unknown) => e instanceof ReservationError && e.code === c;
const reserve = (quoteId: string, ip = "1.1.1.1") => svc.createReservation({ quoteId, customerName: "Ann", contact: "ann@example.com", clientIp: ip });

test("quote: server price, deposit rounded once to whole baht, expiry", async () => {
  const q = await svc.quotePrice(itemId);
  const price = Math.round(15.244 * 0.965 * 3000 + 800); // 44931
  assert.equal(q.priceTHB, price);
  assert.equal(q.depositTHB, Math.round(price * 0.1)); // 4493
  assert.equal(q.depositAmount, "4493.00");
  const row = await prisma.quote.findUniqueOrThrow({ where: { id: q.quoteId } });
  assert.equal(row.priceSatang, price * 100);
  assert.equal(row.depositMinor, 449300);
  assert.equal(row.expiresAt.toISOString(), new Date(clock.now().getTime() + 15 * 60_000).toISOString());
});

test("quote refuses when the rate feed is down (Review Focus 1)", async () => {
  const down = createReservations({ prisma, paypal: fake.pp, now: clock.now, getRate: async () => { throw new Error("feed down"); }, config });
  await assert.rejects(down.quotePrice(itemId), code("RATE_UNAVAILABLE"));
  assert.equal(await prisma.quote.count(), 0);
});

test("quote in USD converts at quote time", async () => {
  const usd = createReservations({ prisma, paypal: fake.pp, now: clock.now, getRate: rate, config: { ...config, currency: "USD" } });
  const q = await usd.quotePrice(itemId);
  assert.equal(q.currency, "USD");
  assert.equal(q.depositAmount, "124.81"); // 4493 / 36 = 124.805… → 12481 cents
});

test("reserve: expired, used and unknown quotes refused", async () => {
  const q = await svc.quotePrice(itemId);
  clock.advance(16 * 60_000);
  await assert.rejects(reserve(q.quoteId), code("QUOTE_EXPIRED"));
  await assert.rejects(reserve("nope"), code("NOT_FOUND"));
  clock.set("2026-11-01T10:00:00.000Z");
  await prisma.item.update({ where: { id: itemId }, data: { stock: 2 } });
  await reserve(q.quoteId);
  await assert.rejects(reserve(q.quoteId), code("QUOTE_USED"));
});

test("reserve: invalid customer refused before any claim (Review Focus 2)", async () => {
  const q = await svc.quotePrice(itemId);
  await assert.rejects(svc.createReservation({ quoteId: q.quoteId, customerName: "  ", contact: "a@b.c" }), code("INVALID_CUSTOMER"));
  await assert.rejects(svc.createReservation({ quoteId: q.quoteId, customerName: "x".repeat(5000), contact: "a@b.c" }), code("INVALID_CUSTOMER"));
  await assert.rejects(svc.createReservation({ quoteId: q.quoteId, customerName: "Ann", contact: "ab" }), code("INVALID_CUSTOMER"));
  assert.equal((await prisma.item.findUniqueOrThrow({ where: { id: itemId } })).held, 0);
});

test("reserve: claims a unit, stores PENDING with pending hold and the PayPal order", async () => {
  const q = await svc.quotePrice(itemId);
  const r = await reserve(q.quoteId);
  assert.equal(r.paypalOrderId, "O1");
  assert.deepEqual(fake.pp.calls[0], { op: "createOrder", args: [449300, "THB", `create-${r.reservationId}`] });
  const row = await prisma.reservation.findUniqueOrThrow({ where: { id: r.reservationId } });
  assert.equal(row.status, "PENDING");
  assert.equal(row.clientIp, "1.1.1.1");
  assert.equal(row.heldUntil.getTime(), clock.now().getTime() + 30 * 60_000);
  assert.equal((await prisma.item.findUniqueOrThrow({ where: { id: itemId } })).held, 1);
});

test("race: two quotes, last unit, concurrent reserve → exactly one", async () => {
  const [a, b] = [await svc.quotePrice(itemId), await svc.quotePrice(itemId)];
  const results = await Promise.allSettled([reserve(a.quoteId, "1.1.1.1"), reserve(b.quoteId, "2.2.2.2")]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.ok(results.some((r) => r.status === "rejected" && code("UNAVAILABLE")(r.reason)));
  assert.equal((await prisma.item.findUniqueOrThrow({ where: { id: itemId } })).held, 1);
});

test("race: same quote from two tabs → one reservation, held once (Review Focus 3)", async () => {
  await prisma.item.update({ where: { id: itemId }, data: { stock: 3 } });
  const q = await svc.quotePrice(itemId);
  const results = await Promise.allSettled([reserve(q.quoteId), reserve(q.quoteId)]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.ok(results.some((r) => r.status === "rejected" && code("QUOTE_USED")(r.reason)));
  assert.equal((await prisma.item.findUniqueOrThrow({ where: { id: itemId } })).held, 1);
});

test("PayPal create error → CANCELLED, hold released once", async () => {
  fake.pp.script("createOrder", async () => ({ kind: "unknown", error: "503" }));
  const q = await svc.quotePrice(itemId);
  await assert.rejects(reserve(q.quoteId), code("PAYPAL_UNAVAILABLE"));
  const row = await prisma.reservation.findFirstOrThrow();
  assert.equal(row.status, "CANCELLED");
  assert.equal((await prisma.item.findUniqueOrThrow({ where: { id: itemId } })).held, 0);
  await svc.releaseExpired();
  assert.equal((await prisma.item.findUniqueOrThrow({ where: { id: itemId } })).held, 0);
});

test("expiry: PENDING → CANCELLED and PAID → EXPIRED release once; others untouched", async () => {
  await prisma.item.update({ where: { id: itemId }, data: { stock: 5 } });
  const ids: string[] = [];
  for (let i = 0; i < 4; i++) ids.push((await reserve((await svc.quotePrice(itemId)).quoteId, `9.9.9.${i}`)).reservationId);
  await prisma.reservation.update({ where: { id: ids[1] }, data: { status: "PAID" } });
  await prisma.reservation.update({ where: { id: ids[2] }, data: { status: "REVIEW" } });
  await prisma.reservation.update({ where: { id: ids[3] }, data: { status: "CAPTURING", claimedAt: clock.now() } });
  clock.advance(31 * 60_000);
  assert.equal(await svc.releaseExpired(), 2);
  assert.equal(await svc.releaseExpired(), 0);
  const st = Object.fromEntries((await prisma.reservation.findMany()).map((r) => [r.id, r.status]));
  assert.deepEqual([st[ids[0]], st[ids[1]], st[ids[2]], st[ids[3]]], ["CANCELLED", "EXPIRED", "REVIEW", "CAPTURING"]);
  assert.equal((await prisma.item.findUniqueOrThrow({ where: { id: itemId } })).held, 2);
});

test("per-IP limit counts only live PENDING/CAPTURING, after expiry", async () => {
  await prisma.item.update({ where: { id: itemId }, data: { stock: 5 } });
  await reserve((await svc.quotePrice(itemId)).quoteId);
  await reserve((await svc.quotePrice(itemId)).quoteId);
  await assert.rejects(reserve((await svc.quotePrice(itemId)).quoteId), code("IP_LIMIT"));
  clock.advance(31 * 60_000);
  await reserve((await svc.quotePrice(itemId)).quoteId); // the first two expired
});

test("activeQuote: null when expired or used", async () => {
  await prisma.item.update({ where: { id: itemId }, data: { stock: 2 } });
  const q = await svc.quotePrice(itemId);
  assert.equal((await svc.activeQuote(q.quoteId))?.quoteId, q.quoteId);
  await reserve(q.quoteId);
  assert.equal(await svc.activeQuote(q.quoteId), null);
  const q2 = await svc.quotePrice(itemId);
  clock.advance(16 * 60_000);
  assert.equal(await svc.activeQuote(q2.quoteId), null);
});
```

- [ ] **Step 3: Run** → FAIL (module missing).

- [ ] **Step 4: Implement `src/reservations/service.ts` (this task's part)**

```ts
import type { PrismaClient, Reservation, Item, Quote } from "../generated/prisma/client";
import { Prisma } from "../generated/prisma/client";
import type { PayPal, OrderInfo } from "../paypal/client";
import { fromMinor } from "../paypal/client";
import { unitPrice } from "../lib/pricing";
import { withSqliteRetry } from "../lib/sqliteRetry";

export type ReservationCode = "NOT_FOUND" | "QUOTE_EXPIRED" | "QUOTE_USED" | "UNAVAILABLE" | "IP_LIMIT" | "PAYPAL_UNAVAILABLE" | "RATE_UNAVAILABLE" | "INVALID_CUSTOMER" | "BAD_STATE";
export class ReservationError extends Error {
  constructor(public code: ReservationCode, message: string) { super(message); }
}
export type Config = { depositPercent: number; quoteMinutes: number; pendingMinutes: number; holdMinutes: number; captureStaleSeconds: number; currency: "THB" | "USD"; maxPendingPerIp: number };
export function configFromEnv(env: NodeJS.ProcessEnv = process.env): Config {
  const n = (k: string, d: number) => (env[k] ? Number(env[k]) : d);
  return {
    depositPercent: n("DEPOSIT_PERCENT", 10), quoteMinutes: n("QUOTE_MINUTES", 15), pendingMinutes: n("PENDING_MINUTES", 30),
    holdMinutes: n("HOLD_MINUTES", 2880), captureStaleSeconds: n("CAPTURE_STALE_SECONDS", 60),
    currency: env.PAYPAL_CURRENCY === "USD" ? "USD" : "THB", maxPendingPerIp: 2,
  };
}
export type Deps = { prisma: PrismaClient; paypal: PayPal; now: () => Date; getRate: () => Promise<{ thbPerGram: number; usdToThb: number }>; config: Config };
export type QuoteCard = { quoteId: string; itemId: string; title: string; priceTHB: number; depositTHB: number; currency: string; depositAmount: string; expiresAt: string };

const HOLDING = ["PENDING", "CAPTURING", "PAID", "REVIEW"];
const addMin = (d: Date, m: number) => new Date(d.getTime() + m * 60_000);

export function createReservations({ prisma, paypal, now, getRate, config }: Deps) {
  const card = (q: Quote & { item: Item }): QuoteCard => ({
    quoteId: q.id, itemId: q.itemId, title: q.item.title, priceTHB: q.priceSatang / 100, depositTHB: q.depositSatang / 100,
    currency: q.currency, depositAmount: fromMinor(q.depositMinor), expiresAt: q.expiresAt.toISOString(),
  });

  /** Conditional status change; releases the hold in the same transaction iff the change happened. */
  async function transition(id: string, from: string | string[], to: string, extra: Prisma.ReservationUpdateManyMutationInput = {}, release = false, where: Prisma.ReservationWhereInput = {}) {
    return withSqliteRetry(() => prisma.$transaction(async (tx) => {
      const u = await tx.reservation.updateMany({ where: { id, status: Array.isArray(from) ? { in: from } : from, ...where }, data: { status: to, ...extra } });
      if (u.count === 1 && release) {
        const r = await tx.reservation.findUniqueOrThrow({ where: { id } });
        await tx.item.update({ where: { id: r.itemId }, data: { held: { decrement: 1 } } });
      }
      return u.count === 1;
    }));
  }

  async function releaseExpired() {
    const due = await prisma.reservation.findMany({ where: { status: { in: ["PENDING", "PAID"] }, heldUntil: { lte: now() } }, select: { id: true, status: true } });
    let n = 0;
    for (const r of due) if (await transition(r.id, r.status, r.status === "PENDING" ? "CANCELLED" : "EXPIRED", {}, true, { heldUntil: { lte: now() } })) n++;
    return n;
  }

  async function quotePrice(itemId: string): Promise<QuoteCard> {
    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) throw new ReservationError("NOT_FOUND", "No such piece");
    let rate;
    try { rate = await getRate(); } catch { throw new ReservationError("RATE_UNAVAILABLE", "Live gold rate unavailable"); }
    const priceBaht = unitPrice(item.weight, item.purity, item.laborFee, rate.thbPerGram);
    const depositBaht = Math.round((priceBaht * config.depositPercent) / 100);
    const depositMinor = config.currency === "THB" ? depositBaht * 100 : Math.round((depositBaht / rate.usdToThb) * 100);
    const q = await prisma.quote.create({
      data: { itemId, goldRate: rate.thbPerGram, priceSatang: priceBaht * 100, depositSatang: depositBaht * 100, currency: config.currency, depositMinor, expiresAt: addMin(now(), config.quoteMinutes) },
      include: { item: true },
    });
    return card(q);
  }

  async function activeQuote(quoteId: string) {
    const q = await prisma.quote.findUnique({ where: { id: quoteId }, include: { item: true, reservation: true } });
    return q && !q.reservation && q.expiresAt > now() ? card(q) : null;
  }

  async function createReservation(input: { quoteId: string; customerName: string; contact: string; clientIp?: string }) {
    const customerName = input.customerName.trim(), contact = input.contact.trim();
    if (customerName.length < 1 || customerName.length > 100 || contact.length < 3 || contact.length > 200)
      throw new ReservationError("INVALID_CUSTOMER", "Please give a name (up to 100 characters) and a phone number or email");
    await releaseExpired();
    const q = await prisma.quote.findUnique({ where: { id: input.quoteId }, include: { reservation: true } });
    if (!q) throw new ReservationError("NOT_FOUND", "Quote not found");
    if (q.reservation) throw new ReservationError("QUOTE_USED", "This quote has already been used");
    if (q.expiresAt <= now()) throw new ReservationError("QUOTE_EXPIRED", "This quote has expired");
    if (input.clientIp) {
      const live = await prisma.reservation.count({ where: { clientIp: input.clientIp, status: { in: ["PENDING", "CAPTURING"] } } });
      if (live >= config.maxPendingPerIp) throw new ReservationError("IP_LIMIT", "Too many unpaid reservations; please pay or wait for them to lapse");
    }
    let r: Reservation;
    try {
      r = await withSqliteRetry(() => prisma.$transaction(async (tx) => {
        const claim = await tx.item.updateMany({ where: { id: q.itemId, stock: { gt: prisma.item.fields.held } }, data: { held: { increment: 1 } } });
        if (claim.count !== 1) throw new ReservationError("UNAVAILABLE", "This piece is no longer available"); // zero-row rule
        return tx.reservation.create({ data: { quoteId: q.id, itemId: q.itemId, customerName, contact, clientIp: input.clientIp, status: "PENDING", heldUntil: addMin(now(), config.pendingMinutes) } });
      }));
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new ReservationError("QUOTE_USED", "This quote has already been used");
      throw e;
    }
    const o = await paypal.createOrder(q.depositMinor, q.currency, `create-${r.id}`);
    if (o.kind === "ok") {
      await prisma.reservation.update({ where: { id: r.id }, data: { paypalOrderId: o.value.orderId } });
      return { reservationId: r.id, paypalOrderId: o.value.orderId, currency: q.currency };
    }
    await transition(r.id, "PENDING", "CANCELLED", {}, true);
    throw new ReservationError("PAYPAL_UNAVAILABLE", "PayPal is unavailable, please try again");
  }

  // captureReservation, acceptReview, cancelReview, list: Task 5
  return { quotePrice, activeQuote, createReservation, releaseExpired, transition };
}
```

(`transition` is returned only so Task 5 can extend the same closure; Task 5 replaces this `return` line.)

- [ ] **Step 5: Run** `npm test` → all Task 4 tests PASS. If the "same quote" race returns two `UNAVAILABLE` or leaks `held`, check that the P2002 from `reservation.create` rolls back the claim (it is inside the same transaction).

- [ ] **Step 6: Commit**

```bash
git add server/src/reservations server/test/fakes.ts server/test/reservations-claim.test.ts
git commit -m "feat: reservation quotes, atomic claim, expiry release, per-IP limit"
```

---

### Task 5: Capture state machine and review actions (spec §4.3, §4.5)

**Files:**
- Modify: `server/src/reservations/service.ts`
- Create: `server/test/reservations-capture.test.ts`

**Interfaces:**
- Consumes: Task 4 closure (`transition`, `releaseExpired`, `config`, `now`, `paypal`).
- Produces: `captureReservation(id): Promise<Reservation>`, `acceptReview(id): Promise<Reservation>`, `cancelReview(id): Promise<Reservation>`, `list(): Promise<(Reservation & { item: Item; quote: Quote })[]>`.

- [ ] **Step 1: Write the failing tests** (each maps to a numbered step of §4.3)

```ts
// server/test/reservations-capture.test.ts
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { freshDb, fakeClock } from "./helpers";
import { config, rate, fakePayPal } from "./fakes";
import { createReservations } from "../src/reservations/service";

const { prisma } = await freshDb();
let clock: ReturnType<typeof fakeClock>, fake: ReturnType<typeof fakePayPal>, svc: ReturnType<typeof createReservations>, itemId: string, rid: string;
const status = async (id = rid) => (await prisma.reservation.findUniqueOrThrow({ where: { id } })).status;
const held = async () => (await prisma.item.findUniqueOrThrow({ where: { id: itemId } })).held;
const captures = () => fake.pp.calls.filter((c) => c.op === "captureOrder").length;
const deferred = <T,>() => { let resolve!: (v: T) => void; const p = new Promise<T>((r) => (resolve = r)); return { p, resolve }; };

beforeEach(async () => {
  await prisma.reservation.deleteMany(); await prisma.quote.deleteMany(); await prisma.item.deleteMany();
  clock = fakeClock(); fake = fakePayPal();
  svc = createReservations({ prisma, paypal: fake.pp, now: clock.now, getRate: rate, config });
  itemId = (await prisma.item.create({ data: { title: "Chain", image: "x", weight: 15.244, purity: 0.965, laborFee: 800, stock: 1 } })).id;
  rid = (await svc.createReservation({ quoteId: (await svc.quotePrice(itemId)).quoteId, customerName: "Ann", contact: "ann@x.com" })).reservationId;
  fake.pp.calls.length = 0;
});

test("step 1: uses the stored order id; captures with capture-<id>", async () => {
  const r = await svc.captureReservation(rid);
  assert.equal(r.status, "PAID");
  assert.deepEqual(fake.pp.calls[0], { op: "captureOrder", args: ["O1", `capture-${rid}`] });
  assert.equal(r.heldUntil.getTime(), clock.now().getTime() + 2880 * 60_000);
  assert.equal(await held(), 1);
});

test("step 2: PAID/REVIEW/COLLECTED returned unchanged, no PayPal call", async () => {
  for (const s of ["PAID", "REVIEW", "COLLECTED"]) {
    await prisma.reservation.update({ where: { id: rid }, data: { status: s } });
    assert.equal((await svc.captureReservation(rid)).status, s);
  }
  assert.equal(fake.pp.calls.length, 0);
});

test("step 5: after the PENDING hold passed → no PayPal call, CANCELLED, released once", async () => {
  clock.advance(31 * 60_000);
  assert.equal((await svc.captureReservation(rid)).status, "CANCELLED");
  assert.equal(fake.pp.calls.length, 0);
  assert.equal(await held(), 0);
});

test("self-hold: stock - held = 0 because of this reservation; capture proceeds", async () => {
  assert.equal(await held(), 1); // stock 1, held 1
  assert.equal((await svc.captureReservation(rid)).status, "PAID");
});

test("twice sequential and concurrent → one capture call, PAID", async () => {
  await Promise.all([svc.captureReservation(rid), svc.captureReservation(rid)]);
  await svc.captureReservation(rid);
  assert.equal(captures(), 1);
  assert.equal(await status(), "PAID");
});

test("overlapping captures: second caller only calls getOrder; PayPal would reject a second capture; ends PAID", async () => {
  const gate = deferred<void>();
  fake.pp.script("captureOrder", async () => { await gate.p; return { kind: "ok", value: fake.paid(449300) } as const; }, async () => ({ kind: "refused", status: 422, issue: "DUPLICATE_REQUEST" } as const));
  fake.pp.script("getOrder", async () => ({ kind: "ok", value: { orderStatus: "APPROVED" } } as const));
  const first = svc.captureReservation(rid);
  await new Promise((r) => setTimeout(r, 10));
  const second = await svc.captureReservation(rid); // claim is fresh: leaves it alone
  assert.equal(second.status, "CAPTURING");
  gate.resolve();
  assert.equal((await first).status, "PAID");
  assert.equal(captures(), 1);
});

test("CAPTURING race: expiry during a slow capture does not release; ends PAID", async () => {
  const gate = deferred<void>();
  fake.pp.script("captureOrder", async () => { await gate.p; return { kind: "ok", value: fake.paid(449300) } as const; });
  const p = svc.captureReservation(rid);
  await new Promise((r) => setTimeout(r, 10));
  clock.advance(31 * 60_000);
  assert.equal(await svc.releaseExpired(), 0);
  gate.resolve();
  assert.equal((await p).status, "PAID");
  assert.equal(await held(), 1);
});

test("unknown outcome leaves CAPTURING; later check settles from getOrder without a second capture", async () => {
  fake.pp.script("captureOrder", async () => ({ kind: "unknown", error: "timeout" } as const));
  assert.equal((await svc.captureReservation(rid)).status, "CAPTURING");
  assert.equal(await held(), 1);
  fake.pp.script("getOrder", async () => ({ kind: "ok", value: fake.paid(449300) } as const));
  assert.equal((await svc.captureReservation(rid)).status, "PAID");
  assert.equal(captures(), 1);
});

test("step 4: APPROVED with fresh claim → unchanged; any other status with fresh claim → unchanged", async () => {
  fake.pp.script("captureOrder", async () => ({ kind: "unknown", error: "timeout" } as const));
  await svc.captureReservation(rid);
  fake.pp.script("getOrder", async () => ({ kind: "ok", value: { orderStatus: "APPROVED" } } as const), async () => ({ kind: "ok", value: { orderStatus: "VOIDED" } } as const));
  assert.equal((await svc.captureReservation(rid)).status, "CAPTURING");
  assert.equal((await svc.captureReservation(rid)).status, "CAPTURING");
  assert.equal(captures(), 1);
});

test("stale takeover: APPROVED + stale claim → exactly one re-capture with the same request id", async () => {
  fake.pp.script("captureOrder", async () => ({ kind: "unknown", error: "timeout" } as const));
  await svc.captureReservation(rid);
  clock.advance(61_000);
  fake.pp.script("getOrder", async () => ({ kind: "ok", value: { orderStatus: "APPROVED" } } as const), async () => ({ kind: "ok", value: { orderStatus: "APPROVED" } } as const));
  await Promise.all([svc.captureReservation(rid), svc.captureReservation(rid)]);
  const caps = fake.pp.calls.filter((c) => c.op === "captureOrder");
  assert.equal(caps.length, 2);
  assert.deepEqual(caps.map((c) => c.args[1]), [`capture-${rid}`, `capture-${rid}`]);
  assert.equal(await status(), "PAID");
});

test("stale claim on a lapsed order (VOIDED, and 404) → REVIEW with hold kept", async () => {
  for (const lapsed of [async () => ({ kind: "ok", value: { orderStatus: "VOIDED" } } as const), async () => ({ kind: "refused", status: 404, issue: "NOT_FOUND" } as const)]) {
    await prisma.reservation.update({ where: { id: rid }, data: { status: "CAPTURING", claimedAt: clock.now() } });
    clock.advance(61_000);
    fake.pp.script("getOrder", lapsed);
    assert.equal((await svc.captureReservation(rid)).status, "REVIEW");
    assert.equal(await held(), 1);
  }
});

test("definite refusal: back to PENDING within hold; CANCELLED + release after it", async () => {
  fake.pp.script("captureOrder", async () => ({ kind: "refused", status: 422, issue: "ORDER_NOT_APPROVED" } as const));
  assert.equal((await svc.captureReservation(rid)).status, "PENDING");
  assert.equal(await held(), 1);
  fake.pp.script("captureOrder", async () => { clock.advance(31 * 60_000); return { kind: "refused", status: 422, issue: "INSTRUMENT_DECLINED" } as const; });
  assert.equal((await svc.captureReservation(rid)).status, "CANCELLED");
  assert.equal(await held(), 0);
});

test("settlement: capture PENDING, other currency, other amount → REVIEW; expiry never touches REVIEW", async () => {
  const cases = [
    { orderStatus: "COMPLETED", captureStatus: "PENDING", capturedMinor: 449300, currency: "THB" },
    { orderStatus: "COMPLETED", captureStatus: "COMPLETED", capturedMinor: 449300, currency: "USD" },
    { orderStatus: "COMPLETED", captureStatus: "COMPLETED", capturedMinor: 1, currency: "THB" },
  ];
  for (const value of cases) {
    await prisma.reservation.update({ where: { id: rid }, data: { status: "PENDING", heldUntil: new Date(clock.now().getTime() + 60_000), claimedAt: null } });
    fake.pp.script("captureOrder", async () => ({ kind: "ok", value } as const));
    assert.equal((await svc.captureReservation(rid)).status, "REVIEW");
  }
  clock.advance(10_000 * 60_000);
  await svc.releaseExpired();
  assert.equal(await status(), "REVIEW");
  assert.equal(await held(), 1);
});

test("review actions: accept → PAID with new hold; cancel → CANCELLED released once; non-REVIEW unchanged", async () => {
  await prisma.reservation.update({ where: { id: rid }, data: { status: "REVIEW" } });
  const a = await svc.acceptReview(rid);
  assert.equal(a.status, "PAID");
  assert.equal(a.heldUntil.getTime(), clock.now().getTime() + 2880 * 60_000);
  assert.equal((await svc.cancelReview(rid)).status, "PAID"); // not REVIEW → unchanged
  await prisma.reservation.update({ where: { id: rid }, data: { status: "REVIEW" } });
  assert.equal((await svc.cancelReview(rid)).status, "CANCELLED");
  assert.equal((await svc.cancelReview(rid)).status, "CANCELLED");
  assert.equal(await held(), 0);
});
```

- [ ] **Step 2: Run** → FAIL (`captureReservation` missing).

- [ ] **Step 3: Implement.** Inside `createReservations`, before the `return`, add:

```ts
  const load = (id: string) => prisma.reservation.findUnique({ where: { id }, include: { quote: true } });
  type Loaded = NonNullable<Awaited<ReturnType<typeof load>>>;
  const reload = async (id: string) => (await load(id))!;
  const isStale = (r: Reservation) => !r.claimedAt || r.claimedAt.getTime() <= now().getTime() - config.captureStaleSeconds * 1000;

  /** §4.3 step 7. Only from CAPTURING. */
  async function settle(r: Loaded, info: OrderInfo) {
    const ok = info.captureStatus === "COMPLETED" && info.capturedMinor === r.quote.depositMinor && info.currency === r.quote.currency;
    await prisma.reservation.updateMany({
      where: { id: r.id, status: "CAPTURING" },
      data: ok
        ? { status: "PAID", heldUntil: new Date(now().getTime() + config.holdMinutes * 60_000), captureStatus: info.captureStatus, capturedMinor: info.capturedMinor, claimedAt: null }
        : { status: "REVIEW", captureStatus: info.captureStatus ?? null, capturedMinor: info.capturedMinor ?? null, claimedAt: null },
    });
    return reload(r.id);
  }

  /** §4.3 step 6. Caller must hold the claim (claimedAt === claim). */
  async function doCapture(r: Loaded, claim: Date) {
    const res = await paypal.captureOrder(r.paypalOrderId!, `capture-${r.id}`);
    if (res.kind === "ok") return settle(r, res.value);
    if (res.kind === "refused" && res.issue === "ORDER_ALREADY_CAPTURED") {
      const o = await paypal.getOrder(r.paypalOrderId!);
      return o.kind === "ok" && o.value.orderStatus === "COMPLETED" ? settle(r, o.value) : reload(r.id);
    }
    if (res.kind === "refused") {
      const mine = { claimedAt: claim };
      if (r.heldUntil > now()) await transition(r.id, "CAPTURING", "PENDING", { claimedAt: null }, false, mine);
      else await transition(r.id, "CAPTURING", "CANCELLED", { claimedAt: null }, true, mine);
    }
    return reload(r.id); // unknown: stays CAPTURING
  }

  /** §4.3 step 4. Never calls captureOrder unless it takes over a stale claim. */
  async function resolveCapturing(r: Loaded) {
    const o = await paypal.getOrder(r.paypalOrderId!);
    if (o.kind === "ok" && o.value.orderStatus === "COMPLETED") return settle(r, o.value);
    if (!isStale(r) || o.kind === "unknown") return r;
    if (o.kind === "ok" && o.value.orderStatus === "APPROVED") {
      const claim = now();
      const took = await prisma.reservation.updateMany({ where: { id: r.id, status: "CAPTURING", claimedAt: r.claimedAt }, data: { claimedAt: claim } });
      return took.count === 1 ? doCapture(r, claim) : reload(r.id);
    }
    // stale + neither COMPLETED nor APPROVED (VOIDED, 404, …)
    await prisma.reservation.updateMany({ where: { id: r.id, status: "CAPTURING", claimedAt: r.claimedAt }, data: { status: "REVIEW", claimedAt: null } });
    return reload(r.id);
  }

  async function captureReservation(id: string) {
    const r = await load(id);
    if (!r) throw new ReservationError("NOT_FOUND", "Reservation not found");
    if (r.status === "CAPTURING") return resolveCapturing(r);
    if (r.status !== "PENDING" || !r.paypalOrderId) return r;
    const claim = now();
    const won = await prisma.reservation.updateMany({ where: { id, status: "PENDING", heldUntil: { gt: claim } }, data: { status: "CAPTURING", claimedAt: claim } });
    if (won.count !== 1) {
      await releaseExpired();
      return reload(id);
    }
    return doCapture({ ...r, status: "CAPTURING", claimedAt: claim }, claim);
  }

  async function acceptReview(id: string) {
    await transition(id, "REVIEW", "PAID", { heldUntil: new Date(now().getTime() + config.holdMinutes * 60_000) });
    return reload(id);
  }
  async function cancelReview(id: string) {
    await transition(id, "REVIEW", "CANCELLED", {}, true);
    return reload(id);
  }
  async function list() {
    await releaseExpired();
    return prisma.reservation.findMany({ orderBy: { createdAt: "desc" }, include: { item: true, quote: true }, take: 200 });
  }
```

and replace the return line with:

```ts
  return { quotePrice, activeQuote, createReservation, releaseExpired, captureReservation, acceptReview, cancelReview, list };
```

Note `transition(..., where)` merges `claimedAt: claim` into the `where`, so a refused capture only reverts the claim it owns.

- [ ] **Step 4: Run** `npm test` → all PASS. If "overlapping captures" makes two `captureOrder` calls, the second caller is reaching `doCapture`: check that `resolveCapturing` returns early when `!isStale(r)`.

- [ ] **Step 5: Commit**

```bash
git add server/src/reservations/service.ts server/test/reservations-capture.test.ts
git commit -m "feat: single-capturer CAPTURING state machine, settlement checks, REVIEW actions"
```

---

### Task 6: Reservation HTTP routes, default instance, rate limiter

**Files:**
- Create: `server/src/reservations/index.ts`, `server/src/routes/reservation.ts`, `server/src/lib/rateLimit.ts`, `server/test/reservation-routes.test.ts`
- Modify: `server/src/app.ts`

**Interfaces:**
- Consumes: `createReservations`, `configFromEnv`, `ReservationError` (Tasks 4–5); `createPayPal` (Task 3); `getGoldRate` (Task 2).
- Produces: `getReservations(): ReturnType<typeof createReservations>` (lazy default instance); `rateLimit(opts: { windowMs: number; max: number }): RequestHandler`; HTTP:
  - `GET /api/reservation/config` (public) → `{ paypalClientId: string; currency: string }`
  - `POST /api/reservation/:id/capture` (public, body ignored) → `{ id, status }`
  - `GET /api/reservation` (staff) → list rows `{ id, status, customerName, contact, itemId, itemTitle, priceTHB, depositTHB, heldUntil, createdAt, captureStatus }`
  - `POST /api/reservation/:id/check` (staff) → `{ id, status }`
  - `POST /api/reservation/:id/accept` / `/cancel` (staff, Manager) → `{ id, status }`
  - Error mapping: `ReservationError` `NOT_FOUND` → 404, `RATE_UNAVAILABLE`/`PAYPAL_UNAVAILABLE` → 503, `INVALID_CUSTOMER` → 400, everything else → 409. Body `{ message, code }`.

- [ ] **Step 1: Write the failing tests**

```ts
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
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: `src/lib/rateLimit.ts`**

```ts
import type { RequestHandler } from "express";

/** Fixed-window per-IP limiter. ponytail: in-memory, resets on restart; fine for one Render instance. */
export function rateLimit({ windowMs, max }: { windowMs: number; max: number }): RequestHandler {
  const hits = new Map<string, { n: number; until: number }>();
  return (req, res, next) => {
    const key = req.ip ?? "unknown", t = Date.now();
    const h = hits.get(key);
    if (!h || t > h.until) hits.set(key, { n: 1, until: t + windowMs });
    else if (++h.n > max) { res.status(429).json({ message: "Too many requests, please wait a few minutes" }); return; }
    next();
  };
}
```

- [ ] **Step 4: `src/reservations/index.ts`**

```ts
import { prisma } from "../db";
import { createPayPal } from "../paypal/client";
import { getGoldRate } from "../lib/goldRate";
import { createReservations, configFromEnv } from "./service";

let instance: ReturnType<typeof createReservations> | null = null;
/** Lazy so tests can set env before first use. */
export function getReservations() {
  instance ??= createReservations({
    prisma,
    paypal: createPayPal({ clientId: process.env.PAYPAL_CLIENT_ID ?? "", secret: process.env.PAYPAL_SECRET ?? "", base: process.env.PAYPAL_BASE }),
    now: () => new Date(),
    getRate: getGoldRate,
    config: configFromEnv(),
  });
  return instance;
}
export { ReservationError } from "./service";
```

- [ ] **Step 5: `src/routes/reservation.ts`**

```ts
import { Router, type Response } from "express";
import { authenticate } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";
import { getReservations, ReservationError } from "../reservations";
import { configFromEnv } from "../reservations/service";

export function sendReservationError(res: Response, err: unknown) {
  if (!(err instanceof ReservationError)) throw err;
  const status = err.code === "NOT_FOUND" ? 404 : err.code === "INVALID_CUSTOMER" ? 400 : ["RATE_UNAVAILABLE", "PAYPAL_UNAVAILABLE"].includes(err.code) ? 503 : 409;
  res.status(status).json({ message: err.message, code: err.code });
}

const router = Router();

router.get("/config", (_req, res) => {
  res.json({ paypalClientId: process.env.PAYPAL_CLIENT_ID ?? "", currency: configFromEnv().currency });
});

// Public: the PayPal button and /reserve polling call this. The body is never read (§4.3).
router.post("/:id/capture", async (req, res) => {
  try { const r = await getReservations().captureReservation(String(req.params.id)); res.json({ id: r.id, status: r.status }); }
  catch (e) { sendReservationError(res, e); }
});

router.get("/", authenticate, async (_req, res) => {
  const rows = await getReservations().list();
  res.json(rows.map((r) => ({
    id: r.id, status: r.status, customerName: r.customerName, contact: r.contact, itemId: r.itemId, itemTitle: r.item.title,
    priceTHB: r.quote.priceSatang / 100, depositTHB: r.quote.depositSatang / 100, heldUntil: r.heldUntil, createdAt: r.createdAt, captureStatus: r.captureStatus,
  })));
});

router.post("/:id/check", authenticate, async (req, res) => {
  try { const r = await getReservations().captureReservation(String(req.params.id)); res.json({ id: r.id, status: r.status }); }
  catch (e) { sendReservationError(res, e); }
});
router.post("/:id/accept", authenticate, authorize("Manager"), async (req, res) => {
  try { const r = await getReservations().acceptReview(String(req.params.id)); res.json({ id: r.id, status: r.status }); }
  catch (e) { sendReservationError(res, e); }
});
router.post("/:id/cancel", authenticate, authorize("Manager"), async (req, res) => {
  try { const r = await getReservations().cancelReview(String(req.params.id)); res.json({ id: r.id, status: r.status }); }
  catch (e) { sendReservationError(res, e); }
});

export default router;
```

Make `acceptReview`/`cancelReview` throw `ReservationError("NOT_FOUND")` when the id does not exist (add `if (!(await load(id))) throw new ReservationError("NOT_FOUND", "Reservation not found");` at the top of each in `service.ts`).

- [ ] **Step 6: Mount** in `src/app.ts`: `app.use("/api/reservation", reservationRouter);`.

- [ ] **Step 7: Run** `npm test` → PASS. Commit.

```bash
git add server/src/reservations/index.ts server/src/routes/reservation.ts server/src/lib/rateLimit.ts server/src/app.ts server/src/reservations/service.ts server/test/reservation-routes.test.ts
git commit -m "feat: reservation HTTP routes (public capture/config, staff list/check/accept/cancel), rate limiter"
```

---

### Task 7: Collection, hold-aware sales, editor refusals (spec §4.4, §4.5)

**Files:**
- Modify: `server/src/routes/sale.ts`, `server/src/controllers/ItemController.ts`
- Create: `server/test/collect.test.ts`

**Interfaces:**
- Consumes: `getReservations().releaseExpired()` (Task 6), `withSqliteRetry` (Task 1).
- Produces: `POST /api/sale/collect` body `{ reservationId: string; payment: "Cash" | "PromptPay"; amountPaid: number }` → `201 Sale` (with `depositPaid`), replay → `201` same sale, 409 on invalid state. Normal `POST /api/sale` refuses held units. Item update/adjust/delete return 409 `{ message }` when holds or history block them.

- [ ] **Step 1: Write the failing tests**

```ts
// server/test/collect.test.ts
import { test, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { freshDb, startApp, authCookie } from "./helpers";

const { prisma } = await freshDb();
const app = await startApp();
after(() => app.close());
const cookie = authCookie();
let itemId: string, rid: string;

async function paidReservation(status = "PAID", heldUntil = new Date(Date.now() + 3600_000)) {
  const q = await prisma.quote.create({ data: { itemId, goldRate: 3000, priceSatang: 4_493_100, depositSatang: 449_300, currency: "THB", depositMinor: 449_300, expiresAt: new Date() } });
  await prisma.item.update({ where: { id: itemId }, data: { held: { increment: 1 } } });
  return (await prisma.reservation.create({ data: { quoteId: q.id, itemId, customerName: "Ann", contact: "a@x.com", status, heldUntil } })).id;
}
const collect = (body: object) => fetch(`${app.base}/api/sale/collect`, { method: "POST", headers: { "content-type": "application/json", cookie }, body: JSON.stringify(body) });
const item = () => prisma.item.findUniqueOrThrow({ where: { id: itemId } });

beforeEach(async () => {
  await prisma.saleLine.deleteMany(); await prisma.sale.deleteMany(); await prisma.reservation.deleteMany(); await prisma.quote.deleteMany(); await prisma.item.deleteMany();
  itemId = (await prisma.item.create({ data: { title: "Chain", image: "x", weight: 15.244, purity: 0.965, laborFee: 800, stock: 1 } })).id;
  rid = await paidReservation();
});

test("collect uses the quote's price and rate, subtracts the deposit, ignores browser rate/cart", async () => {
  const r = await collect({ reservationId: rid, payment: "Cash", amountPaid: 50_000, goldRate: 1, lines: [{ itemId, quantity: 9 }] });
  assert.equal(r.status, 201);
  const sale = await r.json();
  assert.equal(sale.goldRate, 3000);
  assert.equal(sale.subtotal, 44_931);
  assert.equal(sale.depositPaid, 4_493);
  assert.equal(sale.total, 40_438);
  assert.equal(sale.change, 50_000 - 40_438);
  assert.equal(sale.lines[0].quantity, 1);
  assert.equal(sale.saleKey, `res-${rid}`);
  const it = await item();
  assert.deepEqual([it.stock, it.held], [0, 0]); // self-hold: stock - held was 0, still collected
  assert.equal((await prisma.reservation.findUniqueOrThrow({ where: { id: rid } })).status, "COLLECTED");
});

test("second collection replays: sequential and concurrent → one sale, stock once", async () => {
  const a = await (await collect({ reservationId: rid, payment: "Cash", amountPaid: 50_000 })).json();
  const b = await (await collect({ reservationId: rid, payment: "Cash", amountPaid: 50_000 })).json();
  assert.equal(a.id, b.id);
  await prisma.item.update({ where: { id: itemId }, data: { stock: 2 } });
  const rid2 = await paidReservation();
  const [c, d] = await Promise.all([collect({ reservationId: rid2, payment: "Cash", amountPaid: 50_000 }), collect({ reservationId: rid2, payment: "Cash", amountPaid: 50_000 })]);
  const [cj, dj] = [await c.json(), await d.json()];
  assert.deepEqual([c.status, d.status], [201, 201]);
  assert.equal(cj.id, dj.id);
  assert.equal(await prisma.sale.count(), 2);
  assert.deepEqual([(await item()).stock, (await item()).held], [1, 0]);
});

test("EXPIRED, PENDING, REVIEW, past heldUntil → 409; amount too low → 400", async () => {
  for (const s of ["EXPIRED", "PENDING", "REVIEW"]) {
    await prisma.reservation.update({ where: { id: rid }, data: { status: s } });
    assert.equal((await collect({ reservationId: rid, payment: "Cash", amountPaid: 50_000 })).status, 409);
  }
  await prisma.reservation.update({ where: { id: rid }, data: { status: "PAID", heldUntil: new Date(Date.now() - 1000) } });
  assert.equal((await collect({ reservationId: rid, payment: "Cash", amountPaid: 50_000 })).status, 409);
  await prisma.reservation.update({ where: { id: rid }, data: { heldUntil: new Date(Date.now() + 3600_000) } });
  assert.equal((await collect({ reservationId: rid, payment: "Cash", amountPaid: 10 })).status, 400);
  assert.equal(await prisma.sale.count(), 0);
});

test("reservation no longer PAID inside the transaction → 409, nothing written", async () => {
  // The conditional PAID→COLLECTED update (zero-row rule) is the backstop if reads ever interleave; with
  // serialised SQLite transactions the status check catches it first. Task 4's claim race exercises the rule directly.
  await prisma.reservation.update({ where: { id: rid }, data: { status: "COLLECTED" } });
  const r = await collect({ reservationId: rid, payment: "Cash", amountPaid: 50_000 });
  assert.equal(r.status, 409);
  assert.equal(await prisma.sale.count(), 0);
  assert.equal((await item()).stock, 1);
});

test("normal sale cannot take a held unit", async () => {
  const r = await fetch(`${app.base}/api/sale`, { method: "POST", headers: { "content-type": "application/json", cookie }, body: JSON.stringify({ payment: "Cash", amountPaid: 100_000, goldRate: 3000, lockedAt: new Date().toISOString(), lines: [{ itemId, quantity: 1 }] }) });
  assert.equal(r.status, 409);
});

test("editor: stock below held, delete with hold, delete with history → 409; quotes cascade", async () => {
  const patch = await fetch(`${app.base}/api/item/stock/${itemId}`, { method: "PATCH", headers: { "content-type": "application/json", cookie }, body: JSON.stringify({ quantity: -1 }) });
  assert.equal(patch.status, 409);
  assert.equal((await fetch(`${app.base}/api/item/delete/${itemId}`, { method: "DELETE", headers: { cookie } })).status, 409);
  await prisma.reservation.update({ where: { id: rid }, data: { status: "CANCELLED" } });
  await prisma.item.update({ where: { id: itemId }, data: { held: 0 } });
  assert.equal((await fetch(`${app.base}/api/item/delete/${itemId}`, { method: "DELETE", headers: { cookie } })).status, 409, "history blocks delete (Review Focus 4)");
  const other = (await prisma.item.create({ data: { title: "Ring", image: "x", weight: 3.81, purity: 0.965, laborFee: 300, stock: 1 } })).id;
  await prisma.quote.create({ data: { itemId: other, goldRate: 3000, priceSatang: 1, depositSatang: 1, currency: "THB", depositMinor: 1, expiresAt: new Date() } });
  assert.equal((await fetch(`${app.base}/api/item/delete/${other}`, { method: "DELETE", headers: { cookie } })).status, 200);
  assert.equal(await prisma.quote.count({ where: { itemId: other } }), 0);
});
```

Before writing Step 3, open `ItemController.ts` `adjustStock` and `deleteItem` to confirm their success status codes and the shape of `adjustStock` (it adds `quantity` to stock); adjust the two expectations above only if the existing success code differs from 200.

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Hold-aware normal sale.** In `routes/sale.ts` `POST /`: before `prisma.$transaction`, add `await getReservations().releaseExpired();`. In the transaction change the stock check to:

```ts
if (item.stock - item.held < l.quantity) throw Object.assign(new Error(`Only ${Math.max(0, item.stock - item.held)} of "${item.title}" available (others are reserved)`), { status: 409 });
```

- [ ] **Step 4: Collection endpoint.** Add to `routes/sale.ts` (import `getReservations` from `../reservations`, `withSqliteRetry` from `../lib/sqliteRetry`):

```ts
const collectSchema = z.object({ reservationId: z.string().min(1), payment: z.enum(["Cash", "PromptPay"]), amountPaid: z.number().int().nonnegative() });

// POST /api/sale/collect — balance for a PAID reservation. Price, rate and item come from the reservation's quote.
router.post("/collect", authenticate, async (req, res) => {
  const parsed = collectSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: "Validation error", error: parsed.error.issues }); return; }
  const { reservationId, payment, amountPaid } = parsed.data;
  const key = `res-${reservationId}`;
  const replay = () => prisma.sale.findUnique({ where: { saleKey: key }, include: { lines: true } });

  const existing = await replay();
  if (existing) { res.status(201).json(existing); return; }
  await getReservations().releaseExpired();

  try {
    const sale = await withSqliteRetry(() => prisma.$transaction(async (tx) => {
      const r = await tx.reservation.findUnique({ where: { id: reservationId }, include: { quote: true, item: true } });
      if (!r) throw Object.assign(new Error("Reservation not found"), { status: 404 });
      if (r.status !== "PAID" || r.heldUntil <= new Date()) throw Object.assign(new Error(`Reservation is ${r.status === "PAID" ? "past its hold" : r.status}; ring it up as a normal sale`), { status: 409 });
      const subtotal = r.quote.priceSatang / 100, depositPaid = r.quote.depositSatang / 100, total = subtotal - depositPaid;
      if (amountPaid < total) throw Object.assign(new Error("Amount paid is less than the balance"), { status: 400 });

      const won = await tx.reservation.updateMany({ where: { id: r.id, status: "PAID" }, data: { status: "COLLECTED" } });
      if (won.count !== 1) throw Object.assign(new Error("Already collected"), { status: 409, conflict: true }); // zero-row rule
      await tx.item.update({ where: { id: r.itemId }, data: { stock: { decrement: 1 }, held: { decrement: 1 } } });
      const cashier = await tx.user.findUnique({ where: { id: req.user!.id } });
      const created = await tx.sale.create({
        data: {
          cashierId: req.user!.id, cashierName: cashier?.name ?? req.user!.email, payment, amountPaid, change: amountPaid - total,
          goldRate: r.quote.goldRate, lockedAt: r.quote.createdAt, subtotal, discount: 0, depositPaid, total, promoCodes: "", saleKey: key,
          lines: { create: [{ itemId: r.itemId, title: r.item.title, weight: r.item.weight, purity: r.item.purity, laborFee: r.item.laborFee, unitPrice: subtotal, quantity: 1 }] },
        },
        include: { lines: true },
      });
      await tx.reservation.update({ where: { id: r.id }, data: { saleId: created.id } });
      return created;
    }));
    res.status(201).json(sale);
  } catch (err) {
    const again = await replay(); // a concurrent collection won (unique saleKey or the conditional update)
    if (again) { res.status(201).json(again); return; }
    const status = (err as { status?: number }).status ?? 500;
    if (status === 500) console.error("[collect]", err);
    res.status(status).json({ message: status === 500 ? "Internal server error" : (err as Error).message });
  }
});
```

Register `/collect` before `/:id`.

- [ ] **Step 5: Editor refusals** in `ItemController.ts`:
  - `updateItem`: if `stock` is in the update and `stock < existing.held` → `res.status(409).json({ message: \`${existing.held} units are held by reservations\` })`.
  - `adjustStock`: if `item.stock + quantity < item.held` → same 409.
  - `deleteItem`: after the 404 check:

```ts
if (existing.held > 0) { res.status(409).json({ message: `${existing.held} units are held by reservations` }); return; }
if (await prisma.reservation.count({ where: { itemId: id } })) { res.status(409).json({ message: "This piece has reservation history; set its stock to 0 instead of deleting" }); return; }
```

(Quotes are removed by `onDelete: Cascade`.)

- [ ] **Step 6: Run** `npm test` → PASS; `npx tsc --noEmit` clean. Commit.

```bash
git add server/src/routes/sale.ts server/src/controllers/ItemController.ts server/test/collect.test.ts
git commit -m "feat: reservation collection with replay, hold-aware sales, editor hold refusals"
```

---

### Task 8: Agent and chat endpoint (spec §4.1)

**Files:**
- Create: `server/src/agent/model.ts`, `server/src/agent/agent.ts`, `server/src/routes/agent.ts`, `server/test/agent.test.ts`
- Modify: `server/src/app.ts`

**Interfaces:**
- Consumes: `createReservations` instance methods `quotePrice`, `createReservation`, `activeQuote`, `releaseExpired`, `ReservationError`, `QuoteCard` (Task 4); `getGoldRate`, `unitPrice` (Task 2).
- Produces:

```ts
// model.ts
export type Block = { type: "text"; text: string } | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> } | { type: "tool_result"; tool_use_id: string; content: string; is_error?: boolean };
export type Msg = { role: "user" | "assistant"; content: string | Block[] };
export type Tool = { name: string; description: string; input_schema: object };
export class ModelUnavailable extends Error {}
export function createModel(o: { baseUrl: string; apiKey: string; model: string; fetch?: typeof fetch; timeoutMs?: number }): (system: string, messages: Msg[], tools: Tool[]) => Promise<{ content: Block[]; stop_reason: string }>;
// agent.ts
export type ChatResult = { reply: string; quote?: QuoteCard; reservation?: { reservationId: string; paypalOrderId: string; currency: string } };
export function createAgent(deps: { call: ReturnType<typeof createModel>; reservations: Pick<ReturnType<typeof createReservations>, "quotePrice" | "createReservation" | "activeQuote" | "releaseExpired">; searchCatalog: (q: { query: string; maxPriceTHB?: number }) => Promise<unknown[]> }): { chat(input: { messages: { role: "user" | "assistant"; content: string }[]; activeQuoteId?: string; clientIp?: string }): Promise<ChatResult> };
```

- [ ] **Step 1: Write the failing tests**

```ts
// server/test/agent.test.ts
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { freshDb, startApp } from "./helpers";
import { createModel, ModelUnavailable, type Block } from "../src/agent/model";
import { createAgent } from "../src/agent/agent";

const { prisma } = await freshDb();

/** Model that replays a script of assistant turns. */
function scripted(turns: Block[][]) {
  const seen: unknown[] = [];
  const call = async (system: string, messages: unknown[]) => { seen.push(structuredClone({ system, messages })); const c = turns.shift() ?? [{ type: "text", text: "ok" }]; return { content: c, stop_reason: c.some((b) => b.type === "tool_use") ? "tool_use" : "end_turn" }; };
  return { call: call as never, seen };
}
const fakeRes = {
  quotePrice: async (itemId: string) => { if (itemId !== "I1") throw Object.assign(new Error("No such piece"), { code: "NOT_FOUND" }); return { quoteId: "Q1", itemId: "I1", title: "Chain", priceTHB: 44931, depositTHB: 4493, currency: "THB", depositAmount: "4493.00", expiresAt: "2026-11-01T10:15:00Z" }; },
  createReservation: async () => ({ reservationId: "R1", paypalOrderId: "O1", currency: "THB" }),
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
  const res = { ...fakeRes, createReservation: async () => { made++; return { reservationId: "R1", paypalOrderId: "O1", currency: "THB" }; } };
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
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: `src/agent/model.ts`**

```ts
export type Block = { type: "text"; text: string } | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> } | { type: "tool_result"; tool_use_id: string; content: string; is_error?: boolean };
export type Msg = { role: "user" | "assistant"; content: string | Block[] };
export type Tool = { name: string; description: string; input_schema: object };
export class ModelUnavailable extends Error {}

/** Anthropic-format Messages call (MiniMax gateway). One retry on 5xx/network; 4xx is not retried. */
export function createModel(o: { baseUrl: string; apiKey: string; model: string; fetch?: typeof fetch; timeoutMs?: number }) {
  const f = o.fetch ?? fetch;
  return async (system: string, messages: Msg[], tools: Tool[]): Promise<{ content: Block[]; stop_reason: string }> => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await f(`${o.baseUrl}/v1/messages`, {
          method: "POST",
          headers: { "content-type": "application/json", "x-api-key": o.apiKey, authorization: `Bearer ${o.apiKey}`, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({ model: o.model, max_tokens: 1024, system, messages, tools }),
          signal: AbortSignal.timeout(o.timeoutMs ?? 30_000),
        });
        if (res.ok) return (await res.json()) as { content: Block[]; stop_reason: string };
        if (res.status < 500) throw new ModelUnavailable(`model HTTP ${res.status}`);
      } catch (e) {
        if (e instanceof ModelUnavailable) throw e;
      }
    }
    throw new ModelUnavailable("model unavailable after retry");
  };
}
```

- [ ] **Step 4: `src/agent/agent.ts`**

```ts
import type { Block, Msg, Tool } from "./model";
import type { createModel } from "./model";
import type { createReservations, QuoteCard } from "../reservations/service";

const SYSTEM = `You are the reservation assistant for a Thai gold shop. Customers are remote (tourists, expats, online buyers) and write in English.
Prices are live: gold weight × purity × today's rate + a fixed labour fee. Never state a price you did not get from a tool.
Flow: use searchCatalog to suggest up to 3 pieces; when the customer picks one, call quotePrice and present the quote with this policy, word for word:
"The deposit holds this piece and this price for 48 hours. If it is not collected in time, the deposit is forfeited."
When the customer accepts and gives a name and a phone number or email, call createReservation with the quoteId. Then tell them to pay the deposit with the PayPal button below.
If a tool returns an error about an expired or used quote, call quotePrice again. Keep replies under 80 words. Weights: 1 baht = 15.244 g, 1 salueng = 3.81 g.`;

const TOOLS: Tool[] = [
  { name: "searchCatalog", description: "Find in-stock pieces by keyword (e.g. 'necklace 1 baht') and optional max price in THB.", input_schema: { type: "object", properties: { query: { type: "string" }, maxPriceTHB: { type: "number" } }, required: ["query"] } },
  { name: "quotePrice", description: "Lock a live-rate quote for one piece for 15 minutes. Returns price, 10% deposit and quoteId.", input_schema: { type: "object", properties: { itemId: { type: "string" } }, required: ["itemId"] } },
  { name: "createReservation", description: "Reserve the quoted piece and create the PayPal deposit order. Needs the customer's name and phone or email.", input_schema: { type: "object", properties: { quoteId: { type: "string" }, customerName: { type: "string" }, contact: { type: "string" } }, required: ["quoteId", "customerName", "contact"] } },
];

export type ChatResult = { reply: string; quote?: QuoteCard; reservation?: { reservationId: string; paypalOrderId: string; currency: string } };
type Res = Pick<ReturnType<typeof createReservations>, "quotePrice" | "createReservation" | "activeQuote" | "releaseExpired">;

export function createAgent({ call, reservations, searchCatalog }: { call: ReturnType<typeof createModel>; reservations: Res; searchCatalog: (q: { query: string; maxPriceTHB?: number }) => Promise<unknown[]> }) {
  return {
    async chat({ messages, activeQuoteId, clientIp }: { messages: { role: "user" | "assistant"; content: string }[]; activeQuoteId?: string; clientIp?: string }): Promise<ChatResult> {
      const active = activeQuoteId ? await reservations.activeQuote(activeQuoteId) : null;
      const system = active ? `${SYSTEM}\nActive quote ${active.quoteId}: ${active.title}, price ${active.priceTHB} THB, deposit ${active.depositAmount} ${active.currency}, expires ${active.expiresAt}.` : SYSTEM;
      const convo: Msg[] = messages.map((m) => ({ role: m.role, content: m.content }));
      const result: ChatResult = { reply: "" };
      let reservedThisTurn = false;

      for (let toolCalls = 0; ; ) {
        const out = await call(system, convo, TOOLS);
        const uses = out.content.filter((b): b is Extract<Block, { type: "tool_use" }> => b.type === "tool_use");
        const text = out.content.filter((b): b is Extract<Block, { type: "text" }> => b.type === "text").map((b) => b.text).join("\n").trim();
        if (uses.length === 0 || toolCalls >= 5) { result.reply = text || "Sorry, could you rephrase that?"; return result; }
        convo.push({ role: "assistant", content: out.content });
        const results: Block[] = [];
        for (const u of uses) {
          toolCalls++;
          try {
            let value: unknown;
            if (toolCalls > 5) throw new Error("Tool limit reached for this message");
            if (u.name === "searchCatalog") value = await searchCatalog({ query: String(u.input.query ?? ""), maxPriceTHB: typeof u.input.maxPriceTHB === "number" ? u.input.maxPriceTHB : undefined });
            else if (u.name === "quotePrice") value = result.quote = await reservations.quotePrice(String(u.input.itemId ?? ""));
            else if (u.name === "createReservation") {
              if (reservedThisTurn) throw new Error("Only one reservation per message");
              reservedThisTurn = true;
              value = result.reservation = await reservations.createReservation({ quoteId: String(u.input.quoteId ?? ""), customerName: String(u.input.customerName ?? ""), contact: String(u.input.contact ?? ""), clientIp });
            } else throw new Error(`Unknown tool ${u.name}`);
            results.push({ type: "tool_result", tool_use_id: u.id, content: JSON.stringify(value) });
          } catch (e) {
            results.push({ type: "tool_result", tool_use_id: u.id, content: (e as Error).message, is_error: true });
          }
        }
        convo.push({ role: "user", content: results });
      }
    },
  };
}
```

- [ ] **Step 5: `src/routes/agent.ts`** (also holds the default `searchCatalog`)

```ts
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { getGoldRate } from "../lib/goldRate";
import { unitPrice } from "../lib/pricing";
import { rateLimit } from "../lib/rateLimit";
import { getReservations } from "../reservations";
import { createModel, ModelUnavailable } from "../agent/model";
import { createAgent } from "../agent/agent";

const chatSchema = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(1000) }).strict()).min(1).max(20),
  activeQuoteId: z.string().max(100).optional(),
});

async function searchCatalog({ query, maxPriceTHB }: { query: string; maxPriceTHB?: number }) {
  await getReservations().releaseExpired();
  const rate = await getGoldRate();
  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const items = await prisma.item.findMany({ include: { category: true }, take: 200 });
  return items
    .filter((i) => i.stock - i.held > 0)
    .map((i) => ({ id: i.id, title: i.title, description: i.description, image: i.image, weight: i.weight, purity: i.purity, laborFee: i.laborFee, category: i.category?.name ?? null, inStock: true, priceTHB: unitPrice(i.weight, i.purity, i.laborFee, rate.thbPerGram) }))
    .filter((i) => maxPriceTHB === undefined || i.priceTHB <= maxPriceTHB)
    .filter((i) => words.length === 0 || words.some((w) => `${i.title} ${i.description ?? ""} ${i.category ?? ""}`.toLowerCase().includes(w)))
    .slice(0, 5);
}

const router = Router();
let agent: ReturnType<typeof createAgent> | null = null;

router.post("/chat", rateLimit({ windowMs: 10 * 60_000, max: 20 }), async (req, res) => {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: "Invalid chat request" }); return; }
  agent ??= createAgent({
    call: createModel({ baseUrl: process.env.AI_BASE_URL ?? "", apiKey: process.env.AI_API_KEY ?? "", model: process.env.AI_MODEL ?? "minimax-m3" }),
    reservations: getReservations(),
    searchCatalog,
  });
  try {
    res.json(await agent.chat({ ...parsed.data, clientIp: req.ip }));
  } catch (e) {
    if (e instanceof ModelUnavailable) { res.status(503).json({ message: "The assistant is unavailable, please try again shortly." }); return; }
    throw e;
  }
});

export default router;
```

Mount in `app.ts`: `app.use("/api/agent", agentRouter);`.

- [ ] **Step 6: Run** `npm test` → PASS. Commit.

```bash
git add server/src/agent server/src/routes/agent.ts server/src/app.ts server/test/agent.test.ts
git commit -m "feat: reservation agent (catalog search, quote, reserve) with strict chat contract"
```

- [ ] **Step 7: Live smoke test against MiniMax.** With `server/.env` holding `AI_BASE_URL`, `AI_API_KEY`, `PAYPAL_CLIENT_ID`, `PAYPAL_SECRET`, run `npm run dev` and:

```bash
curl -s localhost:3000/api/agent/chat -H 'content-type: application/json' -d '{"messages":[{"role":"user","content":"Do you have a 1 baht gold necklace?"}]}'
```

Expected: a `reply` naming real seeded pieces with prices. If MiniMax does not emit `tool_use` blocks, record the raw response and stop: the tool format needs adjusting before Task 9.

---

### Task 9: `/reserve` page

**Files:**
- Create: `src/api/reservation.ts`, `src/components/reserve/PayPalButton.tsx`, `src/pages/ReservePage.tsx`
- Modify: `src/routes/AppRouter.tsx`

**Interfaces:**
- Consumes: HTTP from Tasks 6 and 8.
- Produces (client):

```ts
export type QuoteCard = { quoteId: string; itemId: string; title: string; priceTHB: number; depositTHB: number; currency: string; depositAmount: string; expiresAt: string };
export type ChatResponse = { reply: string; quote?: QuoteCard; reservation?: { reservationId: string; paypalOrderId: string; currency: string } };
export type ReservationStatus = "PENDING" | "CAPTURING" | "PAID" | "REVIEW" | "COLLECTED" | "EXPIRED" | "CANCELLED";
export const chat: (messages: { role: "user" | "assistant"; content: string }[], activeQuoteId?: string) => Promise<ChatResponse>;
export const getPayConfig: () => Promise<{ paypalClientId: string; currency: string }>;
export const capture: (id: string) => Promise<{ id: string; status: ReservationStatus }>;
export type StaffReservation = { id: string; status: ReservationStatus; customerName: string; contact: string; itemId: string; itemTitle: string; priceTHB: number; depositTHB: number; heldUntil: string; createdAt: string; captureStatus: string | null };
export const listReservations: () => Promise<StaffReservation[]>;
export const checkPayment: (id: string) => Promise<{ id: string; status: ReservationStatus }>;
export const acceptReview: (id: string) => Promise<{ id: string; status: ReservationStatus }>;
export const cancelReview: (id: string) => Promise<{ id: string; status: ReservationStatus }>;
export const collect: (reservationId: string, payment: "Cash" | "PromptPay", amountPaid: number) => Promise<Sale>;
```

- [ ] **Step 1: `src/api/reservation.ts`** — implement every export above with `request()` from `./client`: `chat` → `POST /agent/chat` `{ messages, activeQuoteId }`; `getPayConfig` → `GET /reservation/config`; `capture` → `POST /reservation/${id}/capture`; `listReservations` → `GET /reservation`; `checkPayment` → `POST /reservation/${id}/check`; `acceptReview`/`cancelReview` → `POST /reservation/${id}/accept|cancel`; `collect` → `POST /sale/collect` `{ reservationId, payment, amountPaid }`. Add `depositPaid?: number` to `Sale` and `held?: number` to `Item` in `src/types/types.ts`.

- [ ] **Step 2: `src/components/reserve/PayPalButton.tsx`**

```tsx
import { useEffect, useRef, useState } from "react";

type PayPalNamespace = { Buttons(o: { createOrder: () => string; onApprove: () => Promise<void>; onError: (e: unknown) => void }): { render(el: HTMLElement): Promise<void>; close(): void } };
declare global { interface Window { paypal?: PayPalNamespace } }

/** Loads the JS SDK once per client id + currency (the currency must match the order's, or the button fails). */
function loadSdk(clientId: string, currency: string): Promise<PayPalNamespace> {
  const src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${currency}&intent=capture`;
  const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
  if (existing && window.paypal) return Promise.resolve(window.paypal);
  document.querySelectorAll('script[src^="https://www.paypal.com/sdk/js"]').forEach((s) => s.remove());
  return new Promise((resolve, reject) => {
    const s = Object.assign(document.createElement("script"), { src, async: true });
    s.onload = () => (window.paypal ? resolve(window.paypal) : reject(new Error("PayPal SDK missing")));
    s.onerror = () => reject(new Error("PayPal SDK failed to load"));
    document.head.appendChild(s);
  });
}

export default function PayPalButton({ clientId, currency, orderId, onApproved, onError }: { clientId: string; currency: string; orderId: string; onApproved: () => void; onError: (msg: string) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let buttons: ReturnType<PayPalNamespace["Buttons"]> | null = null;
    let cancelled = false;
    loadSdk(clientId, currency)
      .then((pp) => {
        if (cancelled || !box.current) return;
        buttons = pp.Buttons({ createOrder: () => orderId, onApprove: async () => onApproved(), onError: () => onError("PayPal could not complete the payment.") });
        return buttons.render(box.current);
      })
      .catch((e) => onError((e as Error).message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; buttons?.close(); };
  }, [clientId, currency, orderId, onApproved, onError]);
  return <div>{loading && <p className="text-ink-soft">Loading PayPal…</p>}<div ref={box} /></div>;
}
```

- [ ] **Step 3: `src/pages/ReservePage.tsx`** — layout uses existing tokens (`bg-paper`, `bg-slip`, `border-brass-300`, `rounded-slip`, `text-ink`, `text-money`), English only.

```tsx
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { chat, capture, getPayConfig, type ChatResponse, type QuoteCard, type ReservationStatus } from "../api/reservation";
import PayPalButton from "../components/reserve/PayPalButton";
import { thb } from "../lib/gold";

type Msg = { role: "user" | "assistant"; content: string };
const POLICY = "The deposit holds this piece and this price for 48 hours. If it is not collected in time, the deposit is forfeited.";
const STATUS_TEXT: Partial<Record<ReservationStatus, string>> = {
  PAID: "Deposit paid. Your piece is held for 48 hours — show your name at the counter.",
  CAPTURING: "Payment received, confirming with PayPal…",
  REVIEW: "Payment received; the shop will confirm it shortly.",
  PENDING: "The payment did not go through. You can try the PayPal button again.",
  CANCELLED: "This reservation expired. Ask for a fresh quote.",
  EXPIRED: "This reservation expired. Ask for a fresh quote.",
};

export default function ReservePage() {
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: "Hello! I can find a gold piece, quote today's price and hold it for you with a 10% PayPal deposit. What are you looking for?" }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [quote, setQuote] = useState<QuoteCard | null>(null);
  const [reservation, setReservation] = useState<ChatResponse["reservation"] | null>(null);
  const [status, setStatus] = useState<ReservationStatus | null>(null);
  const [pay, setPay] = useState<{ paypalClientId: string; currency: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false); // a capture has been tried at least once
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { getPayConfig().then(setPay).catch(() => setError("Payments are unavailable right now.")); }, []);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, quote, status]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const text = input.trim().slice(0, 1000);
    if (!text || busy) return;
    const next = [...messages, { role: "user" as const, content: text }].slice(-20);
    setMessages(next); setInput(""); setBusy(true); setError(null);
    try {
      const r = await chat(next, reservation ? undefined : quote?.quoteId);
      setMessages((m) => [...m, { role: "assistant", content: r.reply }].slice(-20));
      if (r.quote) setQuote(r.quote);
      if (r.reservation) { setReservation(r.reservation); setStatus("PENDING"); } // clears activeQuoteId on later turns
    } catch (err) {
      setError((err as Error).message);
    } finally { setBusy(false); }
  }

  // Poll the capture endpoint itself while CAPTURING: safe to repeat, and it can take over a stale claim (§4.3).
  const onApproved = useCallback(async () => {
    if (!reservation) return;
    setAttempted(true);
    const started = Date.now();
    for (;;) {
      const r = await capture(reservation.reservationId).catch(() => null);
      if (r) setStatus(r.status);
      if (r && r.status !== "CAPTURING") return;
      if (Date.now() - started > 120_000) return;
      await new Promise((ok) => setTimeout(ok, 5000));
    }
  }, [reservation]);
  const onPayError = useCallback((m: string) => setError(m), []);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 bg-paper p-4" lang="en">
      <h1 className="text-display font-bold text-ink">Reserve a gold piece</h1>
      <section className="flex flex-1 flex-col gap-3 rounded-slip border border-brass-300 bg-slip p-4" aria-live="polite">
        {messages.map((m, i) => (
          <p key={i} className={m.role === "user" ? "self-end rounded-slip bg-brass-100 px-3 py-2 text-ink" : "self-start text-ink"}>{m.content}</p>
        ))}
        {quote && !reservation && (
          <div className="rounded-slip border border-brass-500 p-3">
            <p className="font-semibold">{quote.title}</p>
            <p className="text-money font-bold tabular-nums">{thb(quote.priceTHB)}</p>
            <p>Deposit: <span className="tabular-nums">{quote.depositAmount} {quote.currency}</span>{quote.currency !== "THB" && <> (≈ {thb(quote.depositTHB)})</>}</p>
            <p className="text-ink-soft">Quote valid until {new Date(quote.expiresAt).toLocaleTimeString()}. {POLICY}</p>
          </div>
        )}
        {reservation && pay && (status === "PENDING" || status === null) && (
          <PayPalButton clientId={pay.paypalClientId} currency={reservation.currency} orderId={reservation.paypalOrderId} onApproved={onApproved} onError={onPayError} />
        )}
        {status && status !== "PENDING" && <p className="rounded-slip bg-brass-100 p-3 font-semibold" role="status">{STATUS_TEXT[status]}</p>}
        {status === "PENDING" && attempted && <p className="text-ink-soft">{STATUS_TEXT.PENDING}</p>}
        {error && <p className="text-stamp" role="alert">{error}</p>}
        <div ref={end} />
      </section>
      <form onSubmit={send} className="flex gap-2">
        <label className="sr-only" htmlFor="reserve-input">Message</label>
        <input id="reserve-input" value={input} onChange={(e) => setInput(e.target.value)} maxLength={1000} disabled={busy} className="h-12 flex-1 rounded-slip border border-brass-300 bg-slip px-3" placeholder="e.g. a 1 baht necklace under 50,000 THB" />
        <button type="submit" disabled={busy || !input.trim()} className="h-12 rounded-slip bg-brass-700 px-5 font-semibold text-slip disabled:opacity-50">{busy ? "…" : "Send"}</button>
      </form>
    </main>
  );
}
```

- [ ] **Step 4: Route.** In `AppRouter.tsx` add `<Route path="/reserve" element={<ReservePage />} />` next to `/login` (public, outside `ProtectedRoute`).

- [ ] **Step 5: Verify** from repo root: `npx tsc -b && npx eslint . && npm run build`. Then `npm run dev`, open `http://localhost:5173/reserve`, chat to a quote, give a name/email, pay with the sandbox buyer in the PayPal popup, see "Deposit paid". Check `prisma studio` or the staff list shows `PAID`.

- [ ] **Step 6: Commit**

```bash
git add src/api/reservation.ts src/components/reserve src/pages/ReservePage.tsx src/routes/AppRouter.tsx src/types/types.ts
git commit -m "feat: public /reserve chat page with quote card, PayPal button and capture polling"
```

---

### Task 10: Staff reservations page, collection dialog, till badge, editor held display

**Files:**
- Create: `src/pages/ReservationsPage.tsx`, `src/components/reservations/CollectDialog.tsx`
- Modify: `src/routes/AppRouter.tsx`, `src/components/mainWeb/itemCard.tsx`, `src/components/mainWeb/buyItemOverlay.tsx`, `src/components/editorSide/editorItemElement.tsx`, `src/lib/i18n.ts`, the till nav (link to `/reservations`)

**Interfaces:**
- Consumes: `listReservations`, `checkPayment`, `acceptReview`, `cancelReview`, `collect`, `StaffReservation` (Task 9); `getShop` (`src/api/shop.ts`); `PromptPayQR` (`src/components/PromptQR/PromptQR.tsx`, props `{ id: string; amount?: number; size?: number }`); `Dialog` (`src/components/Dialog.tsx`, props `{ label, onClose, children, size?, alert? }`); `thb` from `src/lib/gold`.

- [ ] **Step 1: i18n keys.** Add to `S` in `src/lib/i18n.ts` (each Thai value with `// Thai pending native-speaker review`): `reservations: ["การจอง", "Reservations"]`, `reserved: ["จองแล้ว", "Reserved"]`, `checkPayment: ["ตรวจการชำระ", "Check payment"]`, `collect: ["รับของ", "Collect"]`, `acceptPaid: ["ยืนยันว่าชำระแล้ว", "Accept as paid"]`, `cancelRefunded: ["ยกเลิก (คืนเงินใน PayPal แล้ว)", "Cancel (refunded in PayPal)"]`, `depositPaid: ["มัดจำ PayPal", "PayPal deposit"]`, `balance: ["ยอดคงเหลือ", "Balance"]`, `held: ["ถูกจอง", "held"]`.

- [ ] **Step 2: `CollectDialog.tsx`**

```tsx
import { useEffect, useState } from "react";
import Dialog from "../Dialog";
import Bi from "../Bi";
import PromptPayQR from "../PromptQR/PromptQR";
import { getShop } from "../../api/shop";
import { collect, type StaffReservation } from "../../api/reservation";
import { thb } from "../../lib/gold";
import { useNavigate } from "react-router-dom";

export default function CollectDialog({ r, onClose }: { r: StaffReservation; onClose: () => void }) {
  const balance = r.priceTHB - r.depositTHB;
  const [payment, setPayment] = useState<"Cash" | "PromptPay">("Cash");
  const [cash, setCash] = useState(String(balance));
  const [promptPayId, setPromptPayId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  useEffect(() => { getShop().then((s) => setPromptPayId(s.promptPayId)).catch(() => setPromptPayId(null)); }, []);

  async function submit() {
    setBusy(true); setError(null);
    try {
      const sale = await collect(r.id, payment, payment === "Cash" ? Math.round(Number(cash)) : balance);
      navigate(`/payment/thankyou/${sale.id}`);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <Dialog label={`Collect ${r.itemTitle}`} onClose={onClose}>
      <dl className="grid grid-cols-2 gap-1 tabular-nums">
        <dt>{r.itemTitle}</dt><dd className="text-right">{thb(r.priceTHB)}</dd>
        <dt><Bi k="depositPaid" /></dt><dd className="text-right">−{thb(r.depositTHB)}</dd>
        <dt className="font-bold"><Bi k="balance" /></dt><dd className="text-right text-money font-bold">{thb(balance)}</dd>
      </dl>
      <div className="my-3 flex gap-2">
        {(["Cash", "PromptPay"] as const).map((p) => (
          <button key={p} type="button" aria-pressed={payment === p} onClick={() => setPayment(p)} className={`h-11 flex-1 rounded-slip border ${payment === p ? "border-brass-700 bg-brass-100" : "border-brass-300"}`}>{p}</button>
        ))}
      </div>
      {payment === "Cash"
        ? <input type="number" min={balance} value={cash} onChange={(e) => setCash(e.target.value)} className="h-11 w-full rounded-slip border border-brass-300 px-3 tabular-nums" aria-label="Cash received" />
        : promptPayId ? <PromptPayQR id={promptPayId} amount={balance} size={220} /> : <p className="text-stamp">No PromptPay ID configured.</p>}
      {error && <p className="mt-2 text-stamp" role="alert">{error}</p>}
      <button type="button" disabled={busy || (payment === "Cash" && Number(cash) < balance)} onClick={submit} className="mt-3 h-12 w-full rounded-slip bg-brass-700 font-semibold text-slip disabled:opacity-50"><Bi k="collect" /></button>
    </Dialog>
  );
}
```

- [ ] **Step 3: `ReservationsPage.tsx`**

```tsx
import { useCallback, useEffect, useState } from "react";
import Bi from "../components/Bi";
import CollectDialog from "../components/reservations/CollectDialog";
import { acceptReview, cancelReview, checkPayment, listReservations, type StaffReservation } from "../api/reservation";
import { thb } from "../lib/gold";
import { useAuth } from "../contexts/AuthContext";

export default function ReservationsPage() {
  const [rows, setRows] = useState<StaffReservation[]>([]);
  const [collecting, setCollecting] = useState<StaffReservation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const load = useCallback(() => listReservations().then(setRows).catch((e) => setError((e as Error).message)), []);
  useEffect(() => { load(); const t = setInterval(load, 15_000); return () => clearInterval(t); }, [load]);
  const act = (fn: (id: string) => Promise<unknown>, id: string) => fn(id).then(load).catch((e) => setError((e as Error).message));

  return (
    <main className="min-h-screen bg-paper p-4 md:p-6">
      <h1 className="mb-4 text-display font-bold text-ink"><Bi k="reservations" /></h1>
      {error && <p className="mb-3 text-stamp" role="alert">{error}</p>}
      <ul className="flex flex-col gap-2">
        {rows.map((r) => (
          <li key={r.id} className={`flex flex-wrap items-center gap-3 rounded-slip border bg-slip p-3 ${r.status === "CAPTURING" ? "border-stamp" : r.status === "REVIEW" ? "border-stamp bg-stamp-tint" : "border-brass-300"}`}>
            <span className="w-24 font-semibold">{r.status}</span>
            <span className="flex-1">{r.itemTitle} · {r.customerName} · {r.contact}</span>
            <span className="tabular-nums">{thb(r.priceTHB)} / {thb(r.depositTHB)}</span>
            <span className="text-ink-soft">{new Date(r.heldUntil).toLocaleString()}</span>
            {r.status === "CAPTURING" && <span className="text-stamp">Confirming with PayPal — press Check payment</span>}
            {r.status === "REVIEW" && <span className="text-stamp">Payment needs review in PayPal (capture status / amount does not match)</span>}
            {(r.status === "PENDING" || r.status === "CAPTURING") && <button type="button" onClick={() => act(checkPayment, r.id)} className="h-10 rounded-slip border border-brass-500 px-3"><Bi k="checkPayment" /></button>}
            {r.status === "PAID" && <button type="button" onClick={() => setCollecting(r)} className="h-10 rounded-slip bg-brass-700 px-3 text-slip"><Bi k="collect" /></button>}
            {r.status === "REVIEW" && user?.role === "Manager" && <>
              <button type="button" onClick={() => act(acceptReview, r.id)} className="h-10 rounded-slip border border-brass-500 px-3"><Bi k="acceptPaid" /></button>
              <button type="button" onClick={() => act(cancelReview, r.id)} className="h-10 rounded-slip border border-stamp px-3 text-stamp"><Bi k="cancelRefunded" /></button>
            </>}
          </li>
        ))}
      </ul>
      {collecting && <CollectDialog r={collecting} onClose={() => { setCollecting(null); load(); }} />}
    </main>
  );
}
```

Check `src/contexts/AuthContext.tsx` exports `useAuth` returning `{ user }` with `role`; adapt the import name if it differs.

- [ ] **Step 4: Route and nav.** `AppRouter.tsx`: `<Route path="/reservations" element={<ProtectedRoute><ReservationsPage /></ProtectedRoute>} />`. In `src/components/mainWeb/NavBar.tsx` add a link to `/reservations` labelled `<Bi k="reservations" />`, styled like the existing nav links.

- [ ] **Step 5: Till badge (cut second if late).** In `itemCard.tsx` replace `const soldOut = stock <= 0;` with:

```ts
const available = stock - (item.held ?? 0);
const soldOut = stock <= 0;
const reserved = !soldOut && available <= 0;
```

and render `{reserved && <span className="rounded-slip bg-stamp-tint px-2 text-stamp"><Bi k="reserved" /></span>}` next to the existing sold-out marker. In `buyItemOverlay.tsx` use `const available = stock - (item.held ?? 0)` for `soldOut` (`available <= 0`), the `max` of the quantity input, and the clamp in the submit handler.

- [ ] **Step 6: Editor held display (cut first if late).** In `editorItemElement.tsx`, after the stock line, add `{(item.held ?? 0) > 0 && <p className="text-stamp tabular-nums">{item.held} <Bi k="held" /></p>}`.

- [ ] **Step 7: Verify** `npx tsc -b && npx eslint . && npm run build`; in the browser: reserve and pay on `/reserve` (Task 9), see the row `PAID` on `/reservations`, the till card shows "Reserved" when stock equals held, Collect with Cash → thank-you page shows the sale; row becomes `COLLECTED`.

- [ ] **Step 8: Commit**

```bash
git add src
git commit -m "feat: staff reservations page, collection dialog, reserved badge, editor held count"
```

---

### Task 11: Hosting on Render, demo data, judges' notes (checkpoint ~hour 20)

**Files:**
- Modify: `server/src/app.ts`, `server/package.json`, `server/src/prisma/seed.ts`
- Create: `docs/hackathon/testing-notes.md`, `render.yaml`

- [ ] **Step 1: Serve the built client in production.** In `createApp()`, after the API routers and before `errorHandler`:

```ts
if (process.env.NODE_ENV === "production") {
  const dist = path.join(process.cwd(), "..", "dist");
  app.use(express.static(dist));
  app.get(/^\/(?!api|uploads).*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));
}
```

- [ ] **Step 2: Demo staff user and stock in seed.** In `seed.ts`, after items: if `DEMO_STAFF_EMAIL` and `DEMO_STAFF_PASSWORD` are set, `upsert` a `User` with `role: "Manager"`, `name: "Demo Staff"`, `password: await bcrypt.hash(DEMO_STAFF_PASSWORD, 10)` (import `bcryptjs`). Confirm every seeded item has `stock >= 2`; raise any that do not.

- [ ] **Step 3: Start script.** In `server/package.json` add `"start:demo": "node -e \"require('fs').rmSync('demo.db',{force:true})\" && prisma migrate deploy && tsx src/prisma/seed.ts && tsx src/index.ts"`. It starts from an empty `demo.db` on every boot, so the seed never tries to delete items that reservations reference (`onDelete: Restrict`). Never point it at `dev.db`.

- [ ] **Step 4: `render.yaml`** at the repo root:

```yaml
services:
  - type: web
    name: agis-reserve
    runtime: node
    plan: free
    buildCommand: npm ci && npm run build && npm --prefix server ci && npm --prefix server exec prisma generate
    startCommand: cd server && npm run start:demo
    envVars:
      - { key: NODE_ENV, value: production }
      - { key: DATABASE_URL, value: "file:./demo.db" }
      - { key: PENDING_MINUTES, value: "10" }
      - { key: PAYPAL_CURRENCY, value: THB }
      - { key: AI_MODEL, value: minimax-m3 }
      - { key: AI_BASE_URL, sync: false }
      - { key: AI_API_KEY, sync: false }
      - { key: PAYPAL_CLIENT_ID, sync: false }
      - { key: PAYPAL_SECRET, sync: false }
      - { key: JWT_SECRET, generateValue: true }
      - { key: DEMO_STAFF_EMAIL, sync: false }
      - { key: DEMO_STAFF_PASSWORD, sync: false }
```

Set `PAYPAL_CURRENCY` to what Task 0 decided. Deploy from the Render dashboard (Blueprint).

- [ ] **Step 5: Checkpoint run on Render.** On the Render URL: `/reserve` → quote → reserve → pay as the sandbox buyer → "Deposit paid". Log in with the demo staff account → `/reservations` shows `PAID` → Collect (Cash) → thank-you page. Also force an unknown capture once: set `PAYPAL_BASE` to a URL that times out for one deploy, or temporarily block the network call, and confirm `/reserve` shows "confirming with PayPal" and the staff row is highlighted; restore. Record the time spent so far; if over ~22 h, apply the cut order from Global Constraints.

- [ ] **Step 6: `docs/hackathon/testing-notes.md`** — English, for judges: demo URL; sandbox buyer email/password; staff login (`DEMO_STAFF_EMAIL` / password); a script ("Ask: 'Do you have a 1 baht gold necklace?' …" — write the prompt from the seeded catalog and that day's prices); note that reservations and data reset when the free instance sleeps or redeploys and the first request after sleep may take ~1 minute; the 48 h hold is real time; deposits are sandbox money.

- [ ] **Step 7: Commit**

```bash
git add server/src/app.ts server/package.json server/src/prisma/seed.ts render.yaml docs/hackathon/testing-notes.md
git commit -m "chore: Render deployment, demo staff and stock, judges' testing notes"
```

---

### Task 12: Submission materials (final week)

**Files:**
- Modify: `README.md`
- Create: `docs/hackathon/video-script.md`

- [ ] **Step 1: README.** Sections: what AGIS is (one paragraph); "What changed since Oct 6, 2026" listing the redesign-loop commits (`git log --oneline fb855f1..HEAD`) grouped as redesign (harden/adapt/optimize/polish) and the agentic reservations feature, with dates; architecture diagram from spec §3; how PayPal and the AI are used (Orders v2 create/capture with request ids, capture-status check, tool-calling agent); local setup (`npm run setup`, `.env` keys); tests (`cd server && npm test`); link to `docs/hackathon/testing-notes.md`.

- [ ] **Step 2: Video script (< 3 min)** in `docs/hackathon/video-script.md`: 0:00 problem (gold prices move; remote buyers can't hold a piece) → 0:25 chat to quote on `/reserve` → 1:05 PayPal sandbox deposit → 1:30 staff page PAID → 1:50 collect balance at the counter with PromptPay → 2:20 what makes it safe (server-side prices, single capture, holds) → 2:45 close. Record, upload to YouTube (public), add the link to the README.

- [ ] **Step 3: Final checks.** `cd server && npm test`; repo root `npx tsc -b && npx eslint . && npm run build`; Render demo end to end once more on submission day; Devpost form fields filled in English.

- [ ] **Step 4: Commit**

```bash
git add README.md docs/hackathon/video-script.md
git commit -m "docs: README with changes since Oct 6, demo video script"
```
