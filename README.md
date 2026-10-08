# AGIS — Agentic Gold POS

**AGIS is a point-of-sale for Thai gold shops, with an in-chat PayPal reservation flow for buyers who are not in the shop.** A tourist, expat or online buyer opens `/reserve`, chats in English with a tool-calling AI agent, gets a live-rate quote for a real piece from the catalog, and pays a 10% PayPal deposit that holds the piece and the quoted price for 48 hours. Staff see the paid booking at `/reservations` and collect the balance at the counter through the existing Cash / PromptPay checkout. Adapted from [CSC105-G01-ONE-POS](https://github.com/Trueguy64/CSC105-G01-ONE-POS) and submitted to the [PayPal AI Hackathon](https://paypalaihackathon.devpost.com/) (deadline 2026-11-12 12:00 PT).

**Live demo, judge logins, and troubleshooting:** see [`docs/hackathon/testing-notes.md`](docs/hackathon/testing-notes.md).
**Demo video:** `<YouTube link after upload>` (under 3 minutes; see [`docs/hackathon/video-script.md`](docs/hackathon/video-script.md) for the script).

## What changed since Oct 6, 2026

The redesign-loop branch holds **36 commits** between the Oct 6 base — `fb855f1 Added a lot of stuff`, the last commit on the pre-hackathon `main` — and `a976c50`, the most recent redesign-loop commit before this README. They are grouped by phase. All dates are 2026-10-08 unless noted.

### Redesign loop on the existing POS (the four cycles + a re-audit)

The four short cycles that came out of the design review of the live system.

**Harden — make the wrong write impossible.**
- `f232512` — Redesign baseline + harden: popover dismissal, sale idempotency key.
- `021c383` — harden: block locking a stale rate, keep editor filter on add, server-side editor fetch, Bi labels.

**Adapt — change UI to fit the work, not the spec.**
- `da0e910` — adapt: sticky receipt footer only after header scrolls off, phone search width, printed sub-line split.
- `86021a7` — loop: log adapt round.

**Optimize — do less on the wire and on the GPU.**
- `9a0ba19` — optimize: server-side catalog filtering, lazy card images.
- `cedebeb` — loop: log optimize round.

**Polish — make the existing surface feel finished.**
- `24372d0` — polish: QR ink from token, `en()`/`th()` instead of raw `S[]` lookups.
- `5640519` — loop: log polish round.

**Audit — read the diff the way a stranger would.**
- `ed8b571` — docs: agentic reservations design spec, hackathon ideas and rules.
- `279f856` — audit: post-loop re-audit 2026-10-08.
- `3d5838b` — loop: log re-audit, loop stopped.

### Agentic reservations — the new feature

Spec first, then code, then UI.

**Spec revisions.**
- `2ce0732` — spec rev 2 (CAPTURING state, capture status check, chat contract, editor hold rules).
- `4834539` — spec rev 3 (single capturer, REVIEW actions, concurrent collect replay, clock, limits, checkpoint).
- `e8bef7d` — spec rev 3 consistency (frontend states, error table).
- `74eead7` — spec rev 4 (stale CAPTURING on lapsed order → REVIEW, `clientIp` column, poll endpoint).
- `3451209` — agentic reservations implementation plan.

**Server.**
- `40333ac` — test harness (`node --test` via `tsx`, one fresh migrated SQLite per test file via `test/helpers.ts`), env loading without override, app factory, SQLite concurrency probe.
- `1657416` — reservation schema (`Item.held`, `Quote`, `Reservation`, `Sale.depositPaid`), shared pricing and gold rate.
- `5fad20f` — add-only reservations migration.
- `d12dadd` — PayPal Orders v2 client with integer-money parsing and refusal/unknown classification.
- `a07077a` — PayPal client rejects id-less orders, refreshes token on 401, guards `fromMinor`.
- `2e2571e` — reservation quotes, atomic claim, expiry release, per-IP limit.
- `4768683` — enforce per-IP reservation limit inside the claim transaction.
- `a96382a` — single-capturer CAPTURING state machine, settlement checks, REVIEW actions.
- `d0a3d72` — stale capture → REVIEW only for lapsed orders; cover already-captured and late-refusal paths.
- `64914cc` — reservation HTTP routes (public capture/config, staff list/check/accept/cancel), rate limiter.
- `bafcf98` — reservation collection with replay, hold-aware sales, editor hold refusals.
- `f7540dd` — run expiry in `/collect` per spec; test resets the expired row.
- `8b9e7b8` — editor stock and delete writes are conditional on holds.

**Agent.**
- `0683a2e` — reservation agent (catalog search, quote, reserve) with strict chat contract.
- `81850a2` — public `/reserve` chat page with quote card, PayPal button and capture polling.
- `ef377b1` — `/reserve` shows confirming state during capture, single polling loop.
- `48058c1` — reset mounted ref on mount (StrictMode).
- `02be30e` — staff reservations page, collection dialog, reserved badge, editor held count.

**Hosting and judges' notes.**
- `5790316` — Render deployment, demo staff and stock, judges' testing notes.
- `a976c50` — Render build installs dev deps; testing notes give judges explicit logins.

## Architecture

```
/reserve (public React page) ──POST /agent/chat──▶ agent/ (tool loop, fetch-based Messages API client → MiniMax)
      │                                                │ tools: searchCatalog, quotePrice, createReservation
      │                                                ▼
      │                                          reservations/ (Quote, Reservation, holds) ──▶ paypal/ (Orders v2)
      └──PayPal JS SDK button → POST /reservation/:id/capture ──▶ reservations/ ──▶ paypal/
/reservations (staff, behind login) ── list, Check payment, Collect ──▶ /sale (existing, extended)
```

The full design (data model, state machine, edge cases) is in
[`docs/superpowers/specs/2026-10-08-agentic-reservations-design.md`](docs/superpowers/specs/2026-10-08-agentic-reservations-design.md).

## How PayPal and the AI are used

**PayPal** is the only way to reserve. The server uses Orders v2 against the **sandbox**, with the deposit converted from THB to USD only if the sandbox cannot settle a Thai-baht capture to `COMPLETED`.

- `createOrder(minor, currency, requestId)` — creates the order. The `PayPal-Request-Id` is `"create-" + reservationId`, so a retry of the same reservation cannot create a second order. Order id is required; id-less responses are rejected.
- `captureOrder(orderId, requestId)` — captures the order. The `PayPal-Request-Id` is `"capture-" + reservationId`, so a re-capture is a no-op and cannot double-charge. Each PayPal call has a 20 s timeout; the capturer claim stays `CAPTURING` for `CAPTURE_STALE_SECONDS` (default 60), so a timeout leaves the claim intact for the next caller.
- `getOrder(orderId)` — read-only, used to settle a stale claim and to distinguish "already captured" from "order not approved" from "network error".
- Amount strings (`"350.00"`) are parsed to minor units with integer math (`toMinor` / `fromMinor`); a money path never goes through a float.
- A definite refusal (4xx with a PayPal error body, e.g. `ORDER_NOT_APPROVED`) is treated differently from an unknown outcome (timeout, network error, 5xx, 404). The state machine maps them differently: a refusal backs the reservation to `PENDING` so the customer can try again, an unknown leaves `CAPTURING` so the staff "Check payment" button can resolve it.

The hosted demo uses a US PayPal sandbox merchant account (the Thai sandbox merchant account returned `COMPLIANCE_VIOLATION` at approval); a real deployment would use the shop's own PayPal business account, subject to PayPal's availability in Thailand.

**AI.** The agent at `POST /agent/chat` runs a tool-calling loop on `minimax-m3` (configurable through `AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL`). It has three tools, none of which accept amounts or stock counts from the model — every value the model can quote comes from the server:

- `searchCatalog({ query, maxPriceTHB? })` — server-side search over the live catalog, returns each piece with the live THB price.
- `quotePrice({ itemId })` — locks a 15-minute quote, returns the price and the deposit.
- `createReservation({ quoteId, customerName, contact })` — claims one unit and creates the PayPal order.

The reply is short prose; the quote card and the PayPal button on `/reserve` render only from the structured `quote` / `reservation` fields of the response, never from model text.

## Local setup

```sh
npm run setup        # install web + server deps, generate Prisma, migrate, seed items
npm run dev          # Vite on :5173, API on :3000
```

A `Manager` account can be registered at `/register` to edit inventory, categories and promos.
Employees can sell. PromptPay QR codes use the logged-in user's phone number.
The gold rate comes from Swissquote XAU/USD × the ECB USD/THB rate (Frankfurter), cached 60 s in `server/src/routes/gold.ts`.

### Environment

Copy the env values you need into `server/.env`. Defaults shown; only the PayPal and AI values are required to test reservations.

| Name | Default | Meaning |
|---|---|---|
| `DATABASE_URL` | `file:./dev.db` | SQLite file (server/ is the cwd when the server runs) |
| `JWT_SECRET` | — | Cookie signer; set in production |
| `PAYPAL_CLIENT_ID`, `PAYPAL_SECRET` | — | PayPal sandbox app |
| `PAYPAL_BASE` | `https://api-m.sandbox.paypal.com` | Override to test against a mock |
| `PAYPAL_CURRENCY` | `THB` | `USD` if the sandbox cannot settle THB |
| `AI_BASE_URL`, `AI_API_KEY` | —, — | Model gateway |
| `AI_MODEL` | `minimax-m3` | Model id used by the agent |
| `DEPOSIT_PERCENT` | `10` | Deposit share of the quoted price |
| `QUOTE_MINUTES` | `15` | Quote validity |
| `PENDING_MINUTES` | `30` | Hold while the customer approves the payment (Render demo uses `10`) |
| `HOLD_MINUTES` | `2880` | Hold after payment — 48 h; demo may use `2` |
| `CAPTURE_STALE_SECONDS` | `60` | Age after which a `CAPTURING` claim may be taken over; must exceed 20 s |
| `DEMO_STAFF_EMAIL`, `DEMO_STAFF_PASSWORD` | —, — | Render-only: seed a `Manager` on every boot |

## Tests

```sh
cd server && npm test       # node:test via tsx, one fresh migrated SQLite per test file
cd server && npx tsc --noEmit   # server typecheck
npx tsc -b && npx eslint . && npm run build   # root
```

The server suite covers the PayPal client (money parsing, refusal/unknown classification, 401 token refresh, id rejection), the reservation state machine (atomic claim, single capturer, stale takeover, settlement, REVIEW, replay on `/sale`, expiry, per-IP limit, concurrent races), the `/agent/chat` contract (caps, active quote, tool errors, turn limits), the HTTP routes (config, capture, staff list/check/accept/cancel), and the schema migration.
