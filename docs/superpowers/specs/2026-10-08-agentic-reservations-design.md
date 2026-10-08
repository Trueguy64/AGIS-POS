# Agentic Reservations — Design

Date: 2026-10-08 · Status: draft for review (rev 3) · Target: PayPal AI Hackathon (Devpost), submission deadline 2026-11-12 12:00 PT

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
2. **THB in the PayPal sandbox.** A script gets an OAuth token, creates a ฿100.00 Orders v2 order, approves it as the sandbox buyer, captures it, and confirms `purchase_units[0].payments.captures[0].status === "COMPLETED"` (a 201 from the capture call is not enough: a capture can be `PENDING`, e.g. `RECEIVING_PREFERENCE_MANDATES_MANUAL_ACTION` when the receiving account does not hold the currency). If THB cannot be captured to `COMPLETED`, the deposit is charged in USD, converted at quote time with the USD/THB rate the server already fetches for the gold price (Frankfurter), stored on the quote as `depositMinor`, and the THB equivalent is shown.
3. **PayPal Agent Toolkit.** Read its docs. If its order tools can create and capture orders with our server-side amounts and our `PayPal-Request-Id`, and expose the capture status and amount, use it inside the `paypal/` module; otherwise use the plain `fetch` client. The module's interface (section 3) is the same either way.

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
| `server/src/agent/` | `POST /agent/chat`: validates and caps the conversation, runs the tool-calling loop, returns the reply plus structured quote / reservation data built from tool results. Holds no conversation state. | Anthropic SDK (`AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`), `reservations/`, catalog read |
| `server/src/reservations/` | Quotes, reservations, the hold counter, expiry, capture. All money and stock rules live here. | Prisma, `paypal/`, the shared price function |
| `server/src/paypal/` | `createOrder(minor, currency, requestId) → { orderId }`, `getOrder(orderId) → OrderInfo`, `captureOrder(orderId, requestId) → OrderInfo`, where `OrderInfo = { orderStatus, captureStatus?, capturedMinor?, currency? }`. Amount strings ("350.00") are parsed to minor units with integer math, never through a float. OAuth token cached until expiry. Takes an injectable `fetch`. Distinguishes a definite refusal (4xx with a PayPal error body) from an unknown outcome (timeout, network error, 5xx). | PayPal REST (sandbox) |
| `server/src/routes/sale.ts` (existing) | Gains an optional `reservationId` path for collection. | `reservations/` |
| Editor item routes (existing) | Refuse stock below `held` and deletion of an item with `held > 0`. | Prisma |

The price function already used by `sale.ts` (`unitPrice(weight, purity, laborFee, thbPerGram)`) moves to a shared module so quotes and sales price pieces identically.

### Frontend units

- `/reserve` (public): chat transcript, input, quote card and PayPal button rendered only from the structured `quote` / `reservation` fields of the chat response (never parsed from the model's text), result state (paid / processing / needs review / failed / expired, see 4.3). The PayPal JS SDK script URL carries `currency=` matching the order's currency. English only.
- `/reservations` (staff, behind existing auth): list by status, "Check payment" (PENDING, CAPTURING; CAPTURING highlighted), "Collect" (PAID), "Accept as paid" / "Cancel (refunded in PayPal)" (REVIEW).
- Till (existing catalog and buy overlay): a "Reserved" badge when a piece has no available units because of holds; the buy action uses available units.
- Editor (existing): shows `held` next to stock; save and delete surface the server's refusal.

### Data model (Prisma)

`Item.id` is a `String` cuid (existing), so foreign keys to it are `String`.

```prisma
model Item {            // existing, one new column and back-relations
  // ...
  held         Int           @default(0) // units claimed by PENDING / CAPTURING / PAID / REVIEW reservations
  quotes       Quote[]
  reservations Reservation[]
}

model Quote {
  id            String       @id @default(cuid(2))
  itemId        String
  item          Item         @relation(fields: [itemId], references: [id])
  goldRate      Float        // THB per gram of pure gold at quote time
  priceSatang   Int          // full piece price, whole satang
  depositSatang Int          // round(priceSatang * DEPOSIT_PERCENT / 100), rounded once here
  currency      String       // "THB" (or "USD" if day-1 check 2 fails)
  depositMinor  Int          // amount charged in `currency` minor units
  expiresAt     DateTime     // createdAt + QUOTE_MINUTES
  createdAt     DateTime     @default(now())
  reservation   Reservation?
}

model Reservation {
  id            String   @id @default(cuid(2))
  quoteId       String   @unique
  quote         Quote    @relation(fields: [quoteId], references: [id])
  itemId        String
  item          Item     @relation(fields: [itemId], references: [id])
  customerName  String
  contact       String
  status        String   // PENDING | CAPTURING | PAID | REVIEW | COLLECTED | EXPIRED | CANCELLED
  paypalOrderId String?  @unique
  captureStatus String?  // PayPal capture status as last seen
  capturedMinor Int?
  heldUntil     DateTime
  saleId        Int?     @unique
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

Available units of an item = `stock - held`. Statuses that hold a unit: `PENDING`, `CAPTURING`, `PAID`, `REVIEW`. Every change of `held` is paired with a conditional status update and happens only when that update changed exactly one row, so a hold is never claimed or released twice.

### Settings (env)

| Name | Default | Meaning |
|---|---|---|
| `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` | MiniMax gateway, —, `minimax-m3` | Agent model |
| `PAYPAL_CLIENT_ID`, `PAYPAL_SECRET`, `PAYPAL_BASE` | —, —, `https://api-m.sandbox.paypal.com` | PayPal sandbox |
| `DEPOSIT_PERCENT` | `10` | Deposit share of the price |
| `QUOTE_MINUTES` | `15` | Quote validity |
| `PENDING_MINUTES` | `30` | Hold while the customer approves the payment; the hosted demo uses `10` |
| `HOLD_MINUTES` | `2880` | Hold after payment (48 h); demo may use `2` |
| `CAPTURE_STALE_SECONDS` | `60` | Age after which a `CAPTURING` claim may be taken over; must exceed the 20 s PayPal timeout |

## 4. Flows

### 4.1 Chat contract and quote

**Request.** `POST /agent/chat` with `{ messages, activeQuoteId? }`.
- `messages`: only `{ role: "user" | "assistant", content: string }` entries are accepted; any other role or non-string content is a 400. This keeps a browser from injecting fake tool calls or tool results.
- Caps: at most 20 messages of history, each at most 1,000 characters (400 otherwise); at most 5 tool calls per turn.
- `activeQuoteId`: the quote shown on the page, if any. The server loads it and, if it exists, has not expired and has no reservation yet, adds a short system note for this turn ("Active quote Q: item, price, deposit, expires at …"), so the model can call `createReservation` with it on a later turn without the id surviving in chat text. An unknown, expired or already-used id is dropped silently. The page clears `activeQuoteId` when a response carries a `reservation`.
- Holding limits: at most one `createReservation` call per turn (further calls in the same turn are refused with a tool error), and at most two `PENDING` / `CAPTURING` reservations per client IP at a time.

**Response.** `{ reply: string, quote?: QuoteCard, reservation?: { reservationId, paypalOrderId, currency } }`. `quote` and `reservation` are built on the server from the tool results of this turn; the page renders the card and the PayPal button only from these fields.

**Tools.**
- `searchCatalog({ query, maxPriceTHB? })` returns, per piece with available units > 0: `id, title, description, image, weight, purity, laborFee, category, inStock, priceTHB` (live rate). Items carry no cost or supplier fields.
- `quotePrice({ itemId })` reads the live rate, computes the price with the shared function, writes a `Quote`, and returns `{ quoteId, title, priceTHB, depositTHB, currency, depositAmount, expiresAt }` (this is the `QuoteCard`). The agent shows it with the policy line: *"The deposit holds this piece and this price for 48 hours. If it is not collected in time, the deposit is forfeited."*

### 4.2 Create reservation (claim before PayPal)

`createReservation({ quoteId, customerName, contact })`:

1. Load the quote; refuse if missing, expired, or already used by a reservation (`quoteId` is unique). The agent's response to any of these is to call `quotePrice` again for a fresh quote.
2. Run expiry release (4.6).
3. In one transaction: claim one unit with `updateMany({ where: { id: itemId, stock: { gt: prisma.item.fields.held } }, data: { held: { increment: 1 } } })` and refuse as unavailable unless `count === 1`; insert `Reservation { status: PENDING, heldUntil: now + PENDING_MINUTES }`.
4. Call `paypal.createOrder(depositMinor, currency, requestId = "create-" + reservation.id)`. On success, save `paypalOrderId` and return `{ reservationId, paypalOrderId, currency }`.
5. On failure: conditional update `PENDING → CANCELLED` (where `status = PENDING`), and decrement `held` only if that update changed one row. The quote is now used, so the agent's retry path gets a fresh quote first, then tells the customer "PayPal is unavailable, please try again".

### 4.3 Capture

`captureReservation(id)` runs for `POST /reservation/:id/capture` (public, called by the PayPal button after approval) and for the staff "Check payment" action. The request body is ignored; nothing in it is read. `reservations/` takes an injectable `now()`; `paypal/` calls use an explicit 20-second timeout. `CAPTURE_STALE_SECONDS` (default 60) is longer than that timeout, so a stale claim can only mean the first attempt has ended.

1. Load the reservation and use its stored `paypalOrderId`.
2. Status `PAID`, `REVIEW` or `COLLECTED`: return it unchanged.
3. Status `EXPIRED` or `CANCELLED`: return it unchanged; no money moves.
4. Status `CAPTURING` (another caller holds the claim, or an earlier attempt ended unknown): call `getOrder` only.
   - Order `COMPLETED`: settle (step 7).
   - Order `APPROVED` and the claim is stale (`updatedAt` older than `CAPTURE_STALE_SECONDS`): take over the claim with a conditional update that bumps `updatedAt` (`where status = CAPTURING and updatedAt = <value read>`); if it changed one row, go to step 6, otherwise return.
   - Order `APPROVED` and the claim is fresh, or any other order status: return the reservation unchanged (the first caller is still working).
5. Status `PENDING`: claim the capture with a conditional update `PENDING → CAPTURING` where `status = PENDING` and `heldUntil > now()`.
   - If no row changed and `heldUntil` has passed: run expiry release for it (→ `CANCELLED`, hold released) and return; the approved PayPal order lapses.
   - If no row changed otherwise, another caller won: reload and return the current status.
   - The reservation's own claim is its hold, so no stock check is made here (a reservation never counts its own hold against itself). Expiry never touches `CAPTURING` (4.6).
6. Only the caller holding the claim (it won step 5 or took over a stale claim in step 4) calls `paypal.captureOrder(paypalOrderId, requestId = "capture-" + id)`; the request id makes repeats safe.
   - Success, or a refusal saying the order is already captured: `getOrder` if needed, then settle (step 7).
   - Other definite refusal (order not approved, declined): conditional update `CAPTURING → PENDING` if `heldUntil > now()`, otherwise `CAPTURING → CANCELLED` and release the hold; return.
   - Unknown outcome (timeout, network error, 5xx, process crash): leave `CAPTURING`; return. A later "Check payment" resolves it through step 4.
7. Settle with a conditional update `where: { id, status: "CAPTURING" }`, storing `captureStatus` and `capturedMinor`:
   - `captureStatus === "COMPLETED"` and `capturedMinor === quote.depositMinor` and currency equal → `PAID`, `heldUntil = now() + HOLD_MINUTES`.
   - Anything else (capture `PENDING`, different amount, different currency) → `REVIEW`. REVIEW keeps its hold and never expires automatically; staff resolve it (4.5).

Every status change above is conditional on the status read in that step, so concurrent captures, "Check payment" and expiry cannot both apply a transition, and only one caller at a time can call `captureOrder`.

The capture route returns the reservation status; `/reserve` shows paid (`PAID`), processing (`CAPTURING`: "Payment received, confirming with PayPal", polls the status every 5 seconds for up to 2 minutes), needs review (`REVIEW`: "Payment received; the shop will confirm"), failed (`PENDING` after a refusal), or expired (`CANCELLED` / `EXPIRED`).

### 4.4 Collect

"Collect" on the staff page opens the existing checkout prefilled from the reservation. `POST /sale` accepts an optional `reservationId`. When present:

- `saleKey` is `"res-" + reservationId`. The existing idempotency check runs first: if a sale with that key exists, the existing sale is returned (replay; no second sale, no second stock change). This is the defined behaviour for a second collection.
- Otherwise the reservation must be `PAID` and `heldUntil` not passed, else 409. An expired reservation is rung up as a normal sale at today's rate, without `reservationId`.
- The line is taken from the reservation (its item, quantity 1, the quote's `goldRate` and price), not from the browser's cart or `goldRate`.
- Total due at the counter = `priceSatang − depositSatang` (both THB, from the quote, regardless of the currency PayPal charged); the receipt shows price, deposit paid via PayPal, and balance.
- In one transaction: create the Sale, decrement the item's `stock` and `held` by 1, and set the reservation `PAID → COLLECTED` with `saleId` (conditional on `status = PAID`).
- If the transaction fails on the unique `saleKey` or the conditional update changes no row (a concurrent collection won), the handler runs the replay lookup again and returns the existing sale. Only if no sale exists for the key does it return 409.
- No availability check against other holds is made for this line: the unit was claimed by this reservation.

Normal sales (no `reservationId`) keep today's behaviour, except the stock check uses available units (`stock - held`) so a held piece cannot be sold at the counter.

### 4.5 Staff page and editor rules

The reservations list shows reservations newest first with status, customer, contact, piece, price, deposit, `heldUntil`. Actions:
- "Check payment" on `PENDING` and `CAPTURING` rows runs `captureReservation`. `CAPTURING` rows are highlighted ("Confirming with PayPal — press Check payment"), since nothing else prompts staff.
- "Collect" on `PAID` rows.
- `REVIEW` rows show "Payment needs review in PayPal (capture status / amount does not match)" and two actions, each a conditional update on `status = REVIEW`:
  - "Accept as paid": `REVIEW → PAID`, `heldUntil = now() + HOLD_MINUTES` (hold kept).
  - "Cancel (refunded in PayPal)": `REVIEW → CANCELLED`, hold released.

Contact details appear only here, behind staff login.

Editor: updating an item's stock below its `held` is refused (409, "N units are held by reservations"); deleting an item with `held > 0` is refused the same way.

### 4.6 Expiry (lazy)

Before any read of reservations or of available stock (catalog, `searchCatalog`, `createReservation`, `/sale`, staff list), run:

- `PENDING` with `heldUntil` passed → `CANCELLED`, release hold.
- `PAID` with `heldUntil` passed → `EXPIRED`, release hold (deposit forfeited per policy).
- `CAPTURING`, `REVIEW`, `COLLECTED`, `EXPIRED`, `CANCELLED`: untouched.

Each transition is a conditional update on the current status, and the hold is decremented only for rows that update changed, so a release never happens twice.

## 5. Error handling

| Condition | Behaviour |
|---|---|
| Model gateway error / 502 | Retry once; then reply "The assistant is unavailable, please try again shortly." Nothing written. |
| Model ignores instructions | Tools are the only writers and validate everything against the database; worst case is a wrong sentence, never a wrong reservation or amount. |
| Browser sends fake tool messages or an order id | Rejected (400) or ignored; see 4.1 and 4.3. |
| Quote expired, used, or piece unavailable | `createReservation` refuses; agent gets a fresh quote or offers alternatives. |
| PayPal error on create | Reservation `CANCELLED`, hold released once, fresh quote before retry. |
| Capture outcome unknown (timeout, crash, restart) | Reservation stays `CAPTURING` with its hold; customer sees "confirming with PayPal"; staff row highlighted; "Check payment" resolves via `getOrder`, re-capturing only once the claim is stale. |
| Tab closed after approval | "Check payment" captures if the order is `APPROVED` and the hold is still valid. PayPal limits how long an approved order can be captured; older ones lapse. |
| Capture `PENDING`, amount or currency mismatch | `REVIEW`; never auto-expires; staff warning. |
| Editor tries to cut stock below holds or delete a held item | 409 with the held count. |
| Abuse | `app.set('trust proxy', 1)`; rate limit ~20 chat requests per IP per 10 minutes; history ≤ 20 messages; message ≤ 1,000 characters; ≤ 5 tool calls per turn. |

## 6. Testing

Runner: Node's built-in `node:test` via `tsx` (already a server dev dependency); no new test dependencies. Each test file uses a fresh temporary SQLite database migrated with `prisma migrate deploy`. `paypal/` and the model client receive a fake `fetch` whose responses (including delays and failures) each test controls, and `reservations/` receives a fake `now()` so tests move the clock explicitly.

1. **Claims, races and capture (4.2, 4.3 step by step)**
   - 4.2 step 1: expired quote refused; used quote refused.
   - Two concurrent `createReservation` calls for an item with 1 available unit: exactly one succeeds, `held` ends at 1. The claim is a single conditional `updateMany`. During development, confirm the test can fail by temporarily replacing the claim with a read-then-write; that check is not kept in the suite.
   - 4.3 step 1: an order id in the request body is ignored; the stored one is used.
   - Capture twice, sequential and concurrent: one PayPal capture with request id `capture-<id>`, one transition to `PAID`.
   - Capture after the PENDING hold passed: no PayPal call; `CANCELLED`; hold released once.
   - Self-hold: capture of a valid PENDING reservation when `stock - held = 0` proceeds.
   - **CAPTURING race:** fake PayPal delays the capture; expiry runs during the delay with the clock past `heldUntil`; the reservation ends `PAID` with `held` unchanged.
   - **Overlapping captures:** two capture calls overlap; fake PayPal is slow on the first and rejects any second capture call; only one `captureOrder` call is made (the second caller only calls `getOrder`), and the reservation ends `PAID`.
   - Stale takeover: claim older than `CAPTURE_STALE_SECONDS` with order `APPROVED` → exactly one caller re-captures with the same request id.
   - Unknown outcome: fake capture times out → `CAPTURING` remains, hold kept; "Check payment" with `getOrder` → `COMPLETED` settles to `PAID` without a second capture call.
   - 4.3 step 4 branches: `getOrder` `COMPLETED` settles without capturing; `APPROVED` with a fresh claim leaves the reservation unchanged; any other status leaves it unchanged.
   - Definite refusal during capture: back to `PENDING` within the hold; `CANCELLED` with release after it.
   - Hold release on every ending: PayPal create error, PENDING timeout, PAID timeout each decrement `held` exactly once, also when expiry runs twice.
2. **Settlement (4.3 step 7) and review actions:** capture status `PENDING` → `REVIEW`; same number but different currency → `REVIEW`; different amount → `REVIEW`; expiry with any `HOLD_MINUTES` leaves `REVIEW` and its hold untouched; "Accept as paid" → `PAID` with a new `heldUntil`; "Cancel (refunded in PayPal)" → `CANCELLED`, `held` decremented once; either action on a non-REVIEW row changes nothing.
3. **Expiry:** `HOLD_MINUTES` set very short → `PAID` becomes `EXPIRED`, `held` decremented, item available again.
4. **Gateway and chat contract:** model fetch returns 502 twice → friendly message, no rows written; a message with role `tool` or non-string content → 400; history over 20 or a message over 1,000 characters → 400; an `activeQuoteId` lets a later turn reserve without the id in any message; a used or expired `activeQuoteId` is ignored; a second `createReservation` in one turn is refused; a third PENDING reservation from one IP is refused.
5. **Collection and editor rules:**
   - `/sale` with `reservationId` uses the quote's rate and price and ignores browser `goldRate` and cart; decrements `stock` and `held`; marks `COLLECTED`.
   - Second collection with the same reservation, run once sequentially and once concurrently → both calls return the same sale; one sale row; `stock` and `held` decremented once.
   - Collection of an `EXPIRED`, `PENDING` or `REVIEW` reservation → 409.
   - Self-hold: collection when `stock - held = 0` because of this reservation's own hold succeeds.
   - Normal sale of a piece whose only unit is held → rejected.
   - Editor: stock below `held` → 409; delete with `held > 0` → 409.
6. **PayPal client:** amount strings parse to minor units with integer math ("350.00" → 35000, "0.10" → 10, "100" → 10000).

**Manual before recording:** the two day-1 scripts; the `/reserve` processing state (force an unknown capture outcome once); one end-to-end run on Render with a sandbox buyer (JS SDK loaded with the matching `currency=`); the opening chat prompt checked against the seeded catalog and that day's prices.

## 7. Delivery

- Hosting: Render free tier, catalog reseeded on boot; reservations reset on redeploy or sleep, stated in the judges' testing notes. Check Render's current free-tier limits during day 1.
- Order of work: day-1 checks → `reservations/` + `paypal/` with tests → agent + `/agent/chat` → `/reserve` and `/reservations` pages, till badge, editor rules, `/sale` collection → hosting → final week: English video (< 3 min), README with "What changed since Oct 6" (citing `redesign-loop` commits), judges' testing notes with sandbox buyer credentials and a staff login for `/reservations`. Demo pieces are seeded with stock of 2 or more, and the hosted demo runs `PENDING_MINUTES=10`, so one abandoned checkout cannot block the next judge.

**Checkpoint and cuts.** By about hour 20, the happy path (chat → quote → reserve → PayPal sandbox capture → PAID on the staff page → collect) runs end to end on Render. Edge-case tests are written against the real modules as each module is built, not left for the end. If time runs short, cut in this order: the editor UI for held stock (keep the server-side refusals and their tests), the till "Reserved" badge (keep the server-side stock check), the `/reserve` polling (keep the processing message). Never cut the capture, expiry or collection tests: they protect the money.
