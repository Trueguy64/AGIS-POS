# Agentic Reservations — Design

Date: 2026-10-08 · Status: draft for review · Target: PayPal AI Hackathon (Devpost), submission deadline 2026-11-12 12:00 PT

## 1. Intent

**Outcome.** A customer who is not in the shop (tourist, expat, online buyer) chats in English with an AI agent, gets a live-rate quote for a real piece from the AGIS catalog, and pays a 10% PayPal deposit that holds the piece and the quoted price for 48 hours. Staff see the paid reservation in AGIS and collect the balance at the counter with the existing Cash / PromptPay checkout.

**Why this, for the hackathon.** PayPal is central (it is the only way to reserve), the AI does real work (catalog search, pricing, reservation via tools), and the audience is credible (Thai locals pay gold shops with PromptPay or cash; remote and foreign buyers are who would use PayPal). Targets the five equally weighted judging criteria and the "Best Use of Agentic Commerce" and "Best Use of PayPal + AI" prizes.

**Constraints (from `docs/hackathon/rules.txt` and the user).**
- PayPal developer platform in the free sandbox; any AI tool; PayPal must be central.
- AGIS is an existing project, so it must be significantly updated during the submission period (started 2026-10-01); the README explains what changed.
- Public repo, demo video under 3 minutes on YouTube, English materials, working demo link free for judges until 2026-12-15.
- Capacity: one person, part-time, about 35 hours total.
- AI provider: MiniMax (`minimax-m3`, university gateway) for both development and the hosted demo, by the user's choice. Base URL, key and model come from env so the provider can change without code changes.

**Success.**
- A judge opens one link, chats, receives a quote, pays the deposit with a PayPal sandbox buyer, and the reservation appears as PAID on the staff page.
- No amount ever comes from the model or the browser.
- Two customers cannot hold the same last piece; a payment is never captured twice; money captured is never silently released.

**Out of scope.** Webhooks, refunds, customer accounts, email/SMS notifications, a reservation-lookup tool for customers, LINE/WhatsApp channels, multi-item reservations (one piece, quantity 1, per reservation).

## 2. Day-1 checks (before any feature code)

Each is about an hour; each can change the design.

1. **MiniMax from a hosted server.** Deploy a throwaway endpoint to Render that makes one `minimax-m3` call through the gateway and returns the reply. If it fails (campus-only network, IP allow-list), stop and choose another provider for the hosted demo; only env values change.
2. **THB in the PayPal sandbox.** A script gets an OAuth token, creates a ฿100.00 Orders v2 order, approves it as the sandbox buyer, and captures it. If the sandbox business account cannot create or capture THB, the deposit is charged in USD, converted at quote time with the USD/THB rate the server already fetches for the gold price (Frankfurter), stored on the quote as `depositMinor`, and the THB equivalent is shown.
3. **PayPal Agent Toolkit.** Read its docs. If its order tools can create and capture orders with our server-side amounts and our `PayPal-Request-Id`, use it inside the `paypal/` module; otherwise use the plain `fetch` client. The module's interface (section 4) is the same either way.

## 3. Architecture

```
/reserve (public React page) ──POST /agent/chat──▶ agent/ (tool loop, Anthropic SDK → MiniMax)
      │                                                │ tools: searchCatalog, quotePrice, createReservation
      │                                                ▼
      │                                          reservations/ (Quote, Reservation, holds) ──▶ paypal/ (Orders v2)
      └──PayPal JS SDK button → POST /reservation/:id/capture ──▶ reservations/ ──▶ paypal/
/reservations (staff, behind login) ── list, Check payment, Collect ──▶ /sale (existing, extended)
```

### Server units

| Unit | Responsibility | Depends on |
|---|---|---|
| `server/src/agent/` | `POST /agent/chat`: validates and caps the conversation, runs the tool-calling loop, maps tool results to replies. Holds no state. | Anthropic SDK (`AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`), `reservations/`, catalog read |
| `server/src/reservations/` | Quotes, reservations, the hold counter, expiry, capture. All money and stock rules live here. | Prisma, `paypal/`, the existing price function |
| `server/src/paypal/` | `createOrder(amount, currency, requestId)`, `getOrder(orderId)`, `captureOrder(orderId, requestId)`. OAuth token cached until expiry. Takes an injectable `fetch`. | PayPal REST (sandbox) |
| `server/src/routes/sale.ts` (existing) | Gains an optional `reservationId` path for collection. | `reservations/` |

The price function already used by `sale.ts` (`unitPrice(weight, purity, laborFee, thbPerGram)`) moves to a shared module so quotes and sales price pieces identically.

### Frontend units

- `/reserve` (public): chat transcript, input, quote card (piece, locked rate, price, deposit, policy text), PayPal JS SDK button for the returned order, result state (paid / failed / expired). English only.
- `/reservations` (staff, behind existing auth): list by status, "Check payment" (PENDING / REVIEW), "Collect" (PAID), REVIEW warning.
- Till (existing catalog and buy overlay): a "Reserved" badge when a piece has no available units because of holds; the buy action uses available units.

### Data model (Prisma)

```prisma
model Item {            // existing, one new column
  // ...
  held  Int @default(0) // units claimed by PENDING / PAID / REVIEW reservations
}

model Quote {
  id            String   @id @default(cuid(2))
  itemId        String
  goldRate      Float    // THB per gram of pure gold at quote time
  priceSatang   Int      // full piece price, whole satang
  depositSatang Int      // round(priceSatang * DEPOSIT_PERCENT / 100), rounded once here
  currency      String   // "THB" (or "USD" if day-1 check 2 fails)
  depositMinor  Int      // amount charged in `currency` minor units
  expiresAt     DateTime // createdAt + QUOTE_MINUTES
  createdAt     DateTime @default(now())
}

model Reservation {
  id            String   @id @default(cuid(2))
  quoteId       String   @unique
  itemId        String
  customerName  String
  contact       String
  status        String   // PENDING | PAID | COLLECTED | EXPIRED | CANCELLED | REVIEW
  paypalOrderId String?  @unique
  capturedMinor Int?
  heldUntil     DateTime
  saleId        Int?     @unique
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

Available units of an item = `stock - held`. Only the `reservations/` unit and the sale route change `held`.

### Settings (env)

| Name | Default | Meaning |
|---|---|---|
| `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` | MiniMax gateway, —, `minimax-m3` | Agent model |
| `PAYPAL_CLIENT_ID`, `PAYPAL_SECRET`, `PAYPAL_BASE` | —, —, `https://api-m.sandbox.paypal.com` | PayPal sandbox |
| `DEPOSIT_PERCENT` | `10` | Deposit share of the price |
| `QUOTE_MINUTES` | `15` | Quote validity |
| `PENDING_MINUTES` | `30` | Hold while the customer approves the payment |
| `HOLD_MINUTES` | `2880` | Hold after payment (48 h); demo may use `2` |

## 4. Flows

### 4.1 Chat and quote

1. `/reserve` sends `{ messages }` to `POST /agent/chat`. Server rejects more than 20 messages of history or any message over 1,000 characters (400), then runs the tool loop with at most 5 tool calls per turn.
2. `searchCatalog({ query, maxPriceTHB? })` returns, per piece with available units > 0: `id, title, description, image, weight, purity, laborFee, category, inStock, priceTHB` (live rate). No other fields exist on items; nothing internal is exposed.
3. `quotePrice({ itemId })` reads the live rate, computes the price with the shared function, writes a `Quote`, and returns `{ quoteId, title, priceTHB, depositTHB, expiresAt }`. The agent shows the quote with the policy line: *"The deposit holds this piece and this price for 48 hours. If it is not collected in time, the deposit is forfeited."*

### 4.2 Create reservation (claim before PayPal)

`createReservation({ quoteId, customerName, contact })`:

1. Load the quote; reject if missing or `expiresAt` has passed ("quote expired, here is a fresh one" is the agent's job).
2. Run expiry release (4.6).
3. Claim one unit atomically: `updateMany({ where: { id: itemId, stock: { gt: prisma.item.fields.held } }, data: { held: { increment: 1 } } })`. If `count !== 1`, reject as unavailable.
4. Insert `Reservation { status: PENDING, heldUntil: now + PENDING_MINUTES }`. Steps 3–4 run in one transaction.
5. Call `paypal.createOrder(depositMinor, currency, requestId = "create-" + reservation.id)`. On success, save `paypalOrderId` and return `{ reservationId, paypalOrderId }`. On failure, set `CANCELLED`, release the hold (decrement `held`), and return an error the agent turns into "PayPal is unavailable, please try again".

### 4.3 Capture (also used by "Check payment")

`POST /reservation/:id/capture` (public, called by the PayPal button) and the staff "Check payment" action both run `captureReservation(id)`:

1. Load the reservation. Never accept an order id from the request; use `paypalOrderId`.
2. Status `PAID` (or `COLLECTED`): return it unchanged.
3. Status not `PENDING`, or `heldUntil` has passed: do not capture; run expiry release for it if needed; return its status. The approved PayPal order lapses; no money moves.
4. The reservation's own claim is its hold, so no further stock check is needed or made (a reservation never counts its own hold against itself).
5. `paypal.captureOrder(paypalOrderId, requestId = "capture-" + id)`. The request id makes repeats safe. For "Check payment", first `getOrder`: `APPROVED` orders are captured as above; `COMPLETED` orders are not captured again, and their captured amount from `getOrder` goes straight to step 6; any other order status returns the reservation unchanged.
6. Compare captured amount and currency with the quote's `depositMinor` / `currency`:
   - equal → `PAID`, `capturedMinor` set, `heldUntil = now + HOLD_MINUTES`;
   - different → `REVIEW`, `capturedMinor` set. REVIEW keeps its hold and never expires automatically; staff resolve it manually.
7. Status changes in steps 6 use a conditional update `where: { id, status: "PENDING" }` so two concurrent captures cannot both transition.

### 4.4 Collect

"Collect" on the staff page opens the existing checkout prefilled from the reservation. `POST /sale` accepts an optional `reservationId`. When present:

- The reservation must be `PAID` and `heldUntil` not passed; otherwise 409. An expired reservation is rung up as a normal sale at today's rate, without `reservationId`.
- The line is taken from the reservation (its item, quantity 1, the quote's `goldRate` and price), not from the browser's cart or `goldRate`.
- Total due at the counter = `priceSatang − depositSatang` (both THB, from the quote, regardless of the currency PayPal charged); the receipt shows price, deposit paid via PayPal, and balance.
- In one transaction: create the Sale with `saleKey = "res-" + reservationId`, decrement the item's `stock` and `held` by 1, set the reservation `COLLECTED` with `saleId`. The unique `saleKey` and the `PAID` precondition block a second collection.
- No availability check against other holds is made for this line: the unit was claimed by this reservation.

Normal sales (no `reservationId`) keep today's behaviour, except the stock check uses available units (`stock - held`) so a held piece cannot be sold at the counter.

### 4.5 Staff page

Lists reservations newest first with status, customer, contact, piece, price, deposit, `heldUntil`. Actions: "Check payment" (PENDING, REVIEW), "Collect" (PAID). REVIEW rows show "Captured amount does not match the deposit; resolve in PayPal". Contact details appear only here, behind staff login.

### 4.6 Expiry (lazy)

Before any read of reservations or of available stock (catalog, `searchCatalog`, `createReservation`, `/sale`, staff list), run:

- `PENDING` with `heldUntil` passed → `CANCELLED`, release hold.
- `PAID` with `heldUntil` passed → `EXPIRED`, release hold (deposit forfeited per policy).
- `REVIEW`, `COLLECTED`, `EXPIRED`, `CANCELLED`: untouched.

Each transition is a conditional update on the current status, and the hold is decremented only when that update changed a row, so a release never happens twice.

## 5. Error handling

| Condition | Behaviour |
|---|---|
| Model gateway error / 502 | Retry once; then reply "The assistant is unavailable, please try again shortly." Nothing written. |
| Model ignores instructions | Tools are the only writers and validate everything against the database; worst case is a wrong sentence, never a wrong reservation or amount. |
| Quote expired / piece unavailable | `createReservation` refuses; agent offers a fresh quote or alternatives. |
| PayPal error on create | Reservation `CANCELLED`, hold released, friendly retry message. |
| Tab closed after approval | Staff "Check payment" captures if the order is `APPROVED` and the hold is still valid. PayPal limits how long an approved order can be captured; older ones lapse. |
| Amount mismatch | `REVIEW`; never auto-expires; staff warning. |
| Abuse | `app.set('trust proxy', 1)`; rate limit ~20 chat requests per IP per 10 minutes; history ≤ 20 messages; message ≤ 1,000 characters; ≤ 5 tool calls per turn. |

## 6. Testing

Runner: Node's built-in `node:test` via `tsx` (already a server dev dependency); no new test dependencies. Each test file uses a fresh temporary SQLite database migrated with `prisma migrate deploy`. `paypal/` and the model client receive a fake `fetch`.

1. **Claims, races, and repeat captures** (matches 4.2 and 4.3 step by step)
   - Two concurrent `createReservation` calls for an item with 1 available unit: exactly one succeeds, `held` ends at 1. The claim is the single conditional `updateMany`, which is atomic regardless of how the calls interleave. During development, confirm the test can fail by temporarily replacing the claim with a read-then-write and seeing the test go red; the check is not kept in the suite.
   - Capture twice (sequential and concurrent): PayPal capture called with the same `PayPal-Request-Id`; one transition to `PAID`.
   - Capture after the PENDING hold passed: no PayPal capture call; reservation `CANCELLED`; hold released.
   - Capture of a valid PENDING reservation when `stock - held = 0` (its own hold): capture proceeds (self-hold test).
   - Hold release on both endings: `CANCELLED` (PayPal create error, PENDING timeout) and `EXPIRED` (PAID timeout) each decrement `held` exactly once, also when expiry runs twice.
2. **Mismatched amount:** captured amount ≠ deposit → `REVIEW`; expiry with any `HOLD_MINUTES` leaves it `REVIEW` with its hold.
3. **Expiry:** `HOLD_MINUTES` set very short → `PAID` becomes `EXPIRED`, `held` decremented, item available again.
4. **Gateway failure:** model fetch returns 502 twice → friendly message, no rows written; PayPal create error → `CANCELLED`, no hold.
5. **Price integrity and collection:**
   - `/sale` with `reservationId` uses the quote's rate and price and ignores browser `goldRate` and cart; decrements `stock` and `held`; marks `COLLECTED`.
   - Second collection → rejected (status / unique `saleKey`).
   - Collection of an `EXPIRED` or `PENDING` reservation → 409.
   - Collection when `stock - held = 0` because of this reservation's own hold → succeeds (self-hold test).
   - Normal sale of a piece whose only unit is held → rejected.

**Manual before recording:** the two day-1 scripts; one end-to-end run on Render with a sandbox buyer; the opening chat prompt checked against the seeded catalog and that day's prices.

## 7. Delivery

- Hosting: Render free tier, catalog reseeded on boot; reservations reset on redeploy or sleep, stated in the judges' testing notes. Check Render's current free-tier limits during day 1.
- Order of work: day-1 checks → `reservations/` + `paypal/` with tests → agent + `/agent/chat` → `/reserve` and `/reservations` pages, till badge, `/sale` collection → hosting → final week: English video (< 3 min), README with "What changed since Oct 6" (citing `redesign-loop` commits), judges' testing notes with sandbox buyer credentials.
