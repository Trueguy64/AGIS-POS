# PayPal AI Hackathon — Ideas for AGIS

> AGIS is a Thai gold-shop POS (Vite + React 19 + Tailwind 4 front-end, Express 5 + Prisma 7 + SQLite back-end). It already accepts **Cash** and **Thai PromptPay QR** at the counter and prints a bilingual Thai/English receipt. This doc explores where **PayPal** and **AI** fit alongside those rails without breaking the counter flow.

---

## (a) Hackathon facts (from `rules.txt`)

| Item | Value | Source |
|---|---|---|
| Hackathon | PayPal AI Hackathon on Devpost | rules.txt §1 |
| Submission period | **Thursday Oct 1, 2026 (09:15 PT) → Thursday Nov 12, 2026 (12:00 PT)** | rules.txt §1 |
| Judging period | Dec 1, 2026 14:00 PT → Dec 15, 2026 08:00 PT | rules.txt §1 |
| Winners announced | on or around Dec 21, 2026 14:00 PT | rules.txt §1 |
| Sponsor | PayPal Inc., San Jose | rules.txt §2 |
| Administrator | Devpost, Inc. | rules.txt §2 |
| Eligibility | Individuals 18+, teams, organizations. **Thailand is NOT on the excluded list** (excluded: Brazil, Quebec, Russia, Crimea, Cuba, Iran, North Korea, OFAC-sanctioned). | rules.txt §3 |
| Required — PayPal | "integrates the PayPal developer platform (using the free sandbox environment)." Any PayPal service works, including **Orders v2, Payouts, Subscriptions, Venmo, Braintree, Xoom, Honey, Zettle, Paidy, Hyperwallet, Simility, Swift Financial**. | rules.txt §4 |
| Required — AI | "an AI tool, model, or platform of their choice… any AI tool works, **as long as PayPal integration is central to the project**." | rules.txt §4 |
| New vs existing | Projects must be either newly created **or**, if pre-existing, "significantly updated after the start of the Hackathon Submission Period." Entrants must explain the significant change. AGIS pre-exists → must be significantly updated. | rules.txt §4 |
| Submission artefacts | Public repo on GitHub/Bitbucket/GitLab with a visible open-source license; **<3-minute YouTube video** (public); text description; **working demo link** (hosted URL **or** clear build instructions) **free for judges until Dec 15, 2026**; English (or English translation) for all materials. | rules.txt §4 |
| Stage One | Pass/fail: theme fit + the required APIs are actually applied. | rules.txt §6 |
| Stage Two criteria (equally weighted) | **Technological Implementation** · **Design** · **Potential Impact** · **Innovation/Idea** · **Presentation** | rules.txt §6 |
| Tie-break order | Tech → Design → Impact → Innovation → Presentation | rules.txt §6 |
| Grand prizes | 1st $12,000 · 2nd $8,000 · 3rd $5,000 | rules.txt §8 |
| Honorable mentions | Most Creative $5,000 · Most Impactful $5,000 · Best Demo Delivery $5,000 · **Best Use of PayPal + AI $5,000** · **Best Use of Agentic Commerce $5,000** | rules.txt §8 |
| Sponsor prizes | AG Grid ($5k / $2k / $1k × 3) · APIMatic ($1k + 6-mo sub × 3) · Bryntum ($1k × 3) · Channel3 ($1.5k) · **Render ($1k / $750 / $500 credits)** · Elastic · KERNEL · Postman · Zapier · Astropods | rules.txt §8 |
| Prize cap per project | 1 Grand Prize **or** 1 Honorable Mention **plus** 1 Sponsor Prize | rules.txt §8 |
| "Significantly updated" bar | "Sponsor and Administrator will determine what constitutes a 'significant change' at their sole discretion." → plan to over-document the diff. | rules.txt §4 |

**Why the "significantly updated" rule matters for AGIS.** AGIS pre-dates the submission period. The PayPal + AI work, the new chat surface, the new `Reservation` model and the new cashier queue are all net-new for the submission. A `## What changed in this submission` section at the top of the README makes the case to judges.

---

## (b) Feature ideas — ranked against the real Stage-Two criteria

1–5 per criterion, equal weight, 25 max. **Effort** is two people, calendar days, scoped to the new code only. **Sponsor-prize overlap** lists prizes the same submission can also enter with cheap additional work.

| # | Idea | Tech | Design | Impact | Innovation | Presentation | Total | Effort | Sponsor-prize overlap |
|---|---|---|---|---|---|---|---|---|---|
| 1 | **Agentic Sales Agent — English chat, live-rate quote, PayPal reservation** | 5 | 4 | 4 | 5 | 5 | **23** | 7 | **Render** (one deploy) · **AG Grid** (cashier queue) · APIMatic (catalog API) |
| 2 | Photo-to-Cart — snap a piece, AI identifies it, PayPal checkout | 4 | 4 | 2 | 3 | 5 | **18** | 5 | Render |
| 3 | Cross-border pickup — pay online with PayPal, settle diff in-store | 4 | 3 | 3 | 3 | 4 | **17** | 6 | Render |
| 4 | Smart Pay (no AI) — PayPal as a third rail beside Cash + PromptPay | 4 | 4 | 2 | 2 | 4 | **16** | 3 | Render |
| 5 | Counter Copilot — AI rate coach + PayPal remote-orders queue | 4 | 3 | 3 | 3 | 3 | **16** | 4 | AG Grid (queue) · Render |
| 6 | Smart Pay v1 — PayPal + AI "split" suggestion *(previous top pick, critiqued)* | 4 | 4 | 2 | 2 | 4 | **16** | 4 | Render |
| 7 | Voice checkout — Thai STT, then PayPal | 3 | 3 | 1 | 3 | 4 | **14** | 3 | Render |

> **Honest impact scoring.** Thai locals do not pay gold shops with PayPal — PromptPay and cash dominate. The credible PayPal audiences for AGIS are (a) foreign tourists and expats buying gold in Thailand and (b) remote/online customers ordering for pickup or delivery. Any idea that pitches "Thai locals will now pay with PayPal" loses the Impact criterion to a project that names a real buyer.
>
> **Tie-break awareness.** Tech is the first tie-breaker, so a higher Tech score beats a higher Impact score on equal total. The agent (#1) wins on both axes.

### Sponsor prizes that are cheap to add on top of any idea

- **Render ($500 / $750 / $1,000 credits).** Deploy the backend + chat surface on Render. Satisfies both the "hosted demo URL" rule and the Render sponsor prize in one move. ~30 minutes of work.
- **AG Grid ($1,000–$5,000).** Use AG Grid for any list the cashier scans: the paid-reservations queue, the remote-orders queue, or the editor's item list. Drop-in component, no new design language.
- **APIMatic ($1,000).** Publish the catalog + reservation API through APIMatic. Moderate effort, three prize slots available.

Bryntum / Channel3 / Elastic / KERNEL / Postman / Zapier / Astropods are not natural fits for AGIS at this scope and are not planned.

### 1. Agentic Sales Agent ⭐ top pick

A small English-language chat widget lives on the shop's public page. A customer ("Hi, I'd like a 1-baht 96.5% necklace under ฿60,000") talks to an LLM agent that knows the AGIS catalog, the **live gold rate**, and the shop's policies. The agent quotes a price, lets the customer pick a piece, **locks the rate for N minutes** (e.g. 15), and creates either a **PayPal Orders v2** checkout for a deposit or full amount, or a **PayPal Invoicing** invoice for the remainder. When PayPal's webhook fires, a **paid reservation** appears in AGIS; the cashier confirms pickup and runs the existing sale flow with the payment already settled. The customer never has to know PromptPay or cash exists; the cashier never has to learn a new flow.

**Why this scores high on every real criterion.**

- *Technological Implementation.* Two PayPal surfaces (Orders v2 + Invoicing), webhooks with signature verification, a real LLM tool-using agent, a rate-locking service, a cashier queue. Non-trivial end-to-end.
- *Design.* The chat is a thin new surface in the same paper-and-slip world; the cashier queue is a new slip. The English chat is the only English-first surface — which is the point.
- *Potential Impact.* Names two real buyers (tourists, expats, online gold buyers) and the real win (a 24/7 sales channel that doesn't need a cashier to staff a chat).
- *Innovation/Idea.* Directly targets the **Best Use of Agentic Commerce** prize category. Gold-by-weight with a live rate and a rate lock is not a generic e-commerce checkout.
- *Presentation.* Two-minute loop: customer chats → live rate stamp ticks → reservation appears in AGIS queue → cashier confirms → receipt prints. Compelling and end-to-end.

**2-minute demo script.**
1. Open the public page on a phone. Customer: "I want a 1-baht 96.5% necklace, around ฿55,000."
2. Agent pulls three matching pieces from the catalog with live prices, asks one clarifying question ("with or without pendant?").
3. Customer picks one. Agent: "Rate locked at ฿66,200/บาท for 15 minutes. I'll send a PayPal invoice for the full amount." PayPal SDK popup opens.
4. Customer approves in PayPal sandbox. Webhook lands. AGIS cashier view shows a new slip: "Paid online · Necklace X · ฿55,100 · pickup today."
5. Cashier taps "Confirm pickup" → existing sale flow runs with `paymentMethod = "PayPal"` (already paid) → bilingual receipt prints, Paid line reads "PayPal · ฿55,100 · txn 8AB12…".

### 2. Photo-to-Cart

Cashier or customer snaps a piece on the counter; a vision model ranks the catalog; one-tap add; PayPal checkout. Strong demo, weak impact — the cashier knows the catalog by sight and the category rail already finds the right piece in two taps.

### 3. Cross-border pickup

Online storefront takes a PayPal order; AGIS picks it up via webhook; customer pays any weight-difference in-store. Real audience (tourists), but the storefront is a new surface with no real user behind it yet, so the demo feels like a mock.

### 4. Smart Pay (no AI) — a cheaper fallback

PayPal as a third button beside Cash and PromptPay; no AI. Same impact as the original Smart Pay, less code, no AI sponsor-prize eligibility, but cheap to ship if the agent's scope slips.

### 5. Counter Copilot

LLM warns the cashier when the live rate moves against a locked sale, and a "remote orders" queue (PayPal pre-pays) confirms pickup. Real feature for the cashier, but the demo is two unrelated screens stitched together.

### 6. Smart Pay v1 — critiqued

This was the previous top pick. It survives the re-score, but the critique is honest:

- **AI is not genuinely needed.** A cashier splitting a ฿57,000 sale between cash and PayPal picks the split themselves; a deterministic heuristic (largest bill → PayPal, smaller → Cash/PromptPay) works as well as an LLM. The "AI suggests" panel is a heuristic dressed up — and judges who ask "what does the model do that a rule can't?" don't get a satisfying answer.
- **PayPal is not central.** PayPal is one of three buttons; the demo is "we added a third payment rail." The receipt shows the new leg, but PayPal isn't driving the experience. The rule "PayPal integration must be central" is satisfied on paper, not in spirit.
- **The audience is wrong.** The Thai-local counter pays PromptPay; the only PayPal buyers are tourists, expats, and online customers — and this idea doesn't reach any of them.

The score reflects that. A real PayPal integration for AGIS should reach a PayPal audience, not bolt PayPal onto a PromptPay flow.

### 7. Voice checkout

Thai STT at a counter tablet over plain HTTP is unreliable (no native wake-word, network drops, accent variance). The fallback would carry the screen anyway, so the STT is decoration. Drop unless someone has prior Thai STT work.

---

## (c) Top idea — integration plan (Agentic Sales Agent)

### PayPal surface

- **PayPal Orders v2** (`/v2/checkout/orders`): create → customer approves via the JS SDK popup → capture server-side. Used for full-amount and deposit checkout.
- **PayPal Invoicing** (`/v2/invoicing/invoices`): alternative for the "send me an invoice for the remainder" path. The customer pays in their own time; AGIS reconciles on `INVOICING.INVOICE.PAID`.
- **PayPal Webhooks** (`PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.DENIED`, `INVOICING.INVOICE.PAID`): the source of truth. Verified with `verify-webhook-signature` on every call; unsigned events rejected.
- **PayPal JS SDK** (`@paypal/paypal-js`): the in-browser popup. Sandbox client id for the demo; live keys live in `server/.env` only.
- **PayPal Agent Toolkit** *(optional stretch)*: if the team wants the agent to call PayPal actions directly rather than going through the AGIS server, the Toolkit is the documented path. Stretch only — the AGIS-server-mediated flow is the submission's main path because the cashier needs to see a paid reservation, which means the server has to know about it.
- **Payouts** *(not used)*: skip refunds via Payouts for the first cut; a sale can be voided in AGIS without a PayPal refund in the demo window.

### AI model and provider

- **Provider: Google Gemini 1.5 Flash** via the official SDK. Cheap, fast, first-class English (the chat is English-only), and a generous free tier. Thai not required on the chat surface.
- **What the agent does.** (a) Retrieves matching pieces from the AGIS catalog (server-side, plain HTTP, no embedding). (b) Re-quotes each piece with the live gold rate at the moment of quoting. (c) Asks one clarifying question when needed (weight tolerance, with/without pendant). (d) Calls a tool that creates a rate-locked reservation + PayPal order/invoice. (e) Returns a short English message with the price, the locked rate, and the expiry.
- **Why not alternatives.** GPT-4o is more expensive and not materially better for this task; Claude is excellent but pricier; a small open-source model is fine but adds a vendor. A fast cheap model with tool-use wins.
- **Determinism.** Output is JSON-validated by Zod; if the model fails or times out, the chat falls back to a structured form (the same fields, no LLM) so the customer is never blocked.

### Data flow

```
Customer opens the shop's public page (English)
   │
   ▼
Chat widget POSTs /api/agent/message  { text, sessionId }
   │   server: pulls AGIS catalog, live gold rate, in-flight reservations
   │   server: calls Gemini with tool-use (catalog_search, lock_rate, create_paypal_order, create_paypal_invoice)
   │   server: tool results are server-side; PayPal credentials never reach the model
   │   server: returns the agent's reply + (optionally) a PayPal approval URL
   ▼
If the agent decided to collect payment now:
   │   Client opens the PayPal JS SDK popup at the approval URL
   │   Customer approves → SDK returns the order id to the client
   │   Client POSTs /api/agent/confirm { orderId } → server captures via Orders v2
   ▼
PayPal webhook (PAYMENT.CAPTURE.COMPLETED or INVOICING.INVOICE.PAID) lands at
   POST /api/paypal/webhook
   │   server: verify-webhook-signature → reject unsigned
   │   server: write Reservation.status = "PAID"
   │   server: snapshot the locked rate, the customer email, the PayPal transaction id
   ▼
Cashier opens AGIS → new slip in the "Paid reservations" queue
   │   cashier: confirms pickup, picks the pieces off the shelf
   │   cashier: taps "Complete sale" → existing sale flow with paymentMethod = "PayPal" (already paid)
   │   cashier: bilingual receipt prints; the Paid line reads "PayPal · ฿55,100 · txn 8AB12…"
   ▼
If 15 minutes pass without payment → Reservation.status = "EXPIRED", rate unlocked.
```

### Files to change (existing)

| File | Change |
|---|---|
| `server/src/routes/sale.ts` | `payment` enum grows to `"Cash" \| "PromptPay" \| "PayPal"`. The existing single-payment flow stays for in-store sales; the agent uses the same enum on completion. |
| `server/src/index.ts` | Mount `agentRouter`, `paypalRouter`, and `reservationRouter`. |
| `server/prisma/schema.prisma` | New `Reservation` model (`id`, `pieceIds[]`, `quotedPrice`, `lockedRate`, `rateLockedAt`, `rateExpiresAt`, `paypalOrderId?`, `paypalInvoiceId?`, `status: "PENDING"\|"PAID"\|"EXPIRED"\|"CANCELLED"`, `customerEmail`). `Sale` gains `reservationId?` so a completed sale traces back to the online quote. |
| `src/api/sale.ts`, `src/api/reservation.ts` (new) | Client wrappers mirroring the existing style. |
| `src/pages/editorMenu.tsx` (or a new `src/pages/ReservationsQueue.tsx`) | Render the paid-reservations queue as an **AG Grid** (counts toward the AG Grid sponsor prize). |
| `src/components/mainWeb/itemCard.tsx` and the receipt/printables | Render a "Paid online via PayPal" leg on the printed receipt when `reservationId` is set. |
| `src/lib/i18n.ts` | New keys for the cashier-side strings (Thai + English): `reservation`, `paidOnline`, `confirmPickup`, `rateLockedUntil`, `reservationExpired`, `agentChatTitle`. The chat surface itself is English-only. |
| `src/lib/gold.ts` | No change to the rate formulas; the reservation snapshot stores the per-baht rate at lock time. |

### New files to add

| File | Purpose |
|---|---|
| `server/src/routes/paypal.ts` | `POST /api/paypal/order`, `POST /api/paypal/capture`, `POST /api/paypal/webhook`, `POST /api/paypal/invoice`. Webhook signature verified on every call. |
| `server/src/services/paypal.ts` | OAuth token cache + thin wrapper over Orders v2, Invoicing, and `verify-webhook-signature`. Token cached in-memory, refreshed on 401. |
| `server/src/routes/agent.ts` | `POST /api/agent/message`, `POST /api/agent/confirm`. The agent endpoint is the only one that touches the LLM. |
| `server/src/services/agent.ts` | Gemini client, system prompt, tool definitions, Zod schema for tool I/O, deterministic fallback when the model fails. |
| `server/src/routes/reservation.ts` | `POST /api/reservation` (create, lock rate), `GET /api/reservation` (cashier queue), `POST /api/reservation/:id/cancel`, plus the cron-driven expiry sweeper. |
| `server/src/services/reservation.ts` | Rate-lock logic: snapshot `ratePerBaht()` and a 15-minute TTL; idempotent on `reservationId`. |
| `src/components/Agent/ChatPanel.tsx` | The English chat surface. One scrollback, one input, one PayPal button when the agent asks for payment. |
| `src/components/Reservations/PaidQueue.tsx` | The cashier's **AG-Grid** queue of paid reservations. |
| `docs/agent-integration.md` | Internal how-to: env vars, sandbox setup, webhook tunnel with `ngrok`, the rate-lock semantics, the void-not-refund path. |
| `render.yaml` | One-file Render Blueprint for the backend + chat surface; satisfies both the "hosted demo URL" rule and the Render sponsor prize. |

### Risks

| Risk | Mitigation |
|---|---|
| **PayPal Thailand THB support in sandbox** — rules.txt does not say whether Orders v2 / Invoicing settles in THB on a Thai-registered merchant account, or only in USD. | Use sandbox throughout; if THB is rejected, fall back to USD with a cashier-facing 1:1 conversion (customer sees ฿, PayPal order is in USD, receipt still shows ฿). Confirm in the first hour of build time, not the day before the demo. |
| **AI hallucination in a sales surface** — model fabricates a piece that doesn't exist, or quotes the wrong rate. | All catalog reads are server-side against the real `Item` rows. All price math is server-side against the locked rate snapshot. The LLM only chooses **which** tool to call and writes the English reply; never invents a price. Output is Zod-validated; bad output → structured form fallback. |
| **AI latency on a chat** — p99 > 2 s feels broken. | Stream the reply (the SDK supports it); show a "thinking" dot. The catalog and rate tools are sub-100 ms; only the model is slow. |
| **PII leakage to the LLM** — customer email and order details go to Gemini. | Strip receipt numbers, cashier names, and shop IDs from the prompt; the customer's email is necessary for the PayPal invoice and is documented in the submission. |
| **Rate lock vs. PayPal capture** — the locked rate must survive the popup. | The lock is on the `Reservation` row in the DB; the PayPal order carries `quoteId = reservationId`; capture reads the same row. |
| **Webhook signature verification** — without it, anyone can forge a "paid" event. | `verify-webhook-signature` on every call; reject unsigned. |
| **Idempotency across the PayPal popup** — customer can approve twice, the chat can retry. | `Idempotency-Key` on the Orders v2 call is the reservation id (UUID v4). Duplicate webhooks are deduped on `paypalOrderId`. |
| **Demo network failure** — judge-side Wi-Fi drops. | Pre-record a 2-minute Loom; the sandbox is local; the cashier's queue is local SQLite. |
| **Thai copy quality** — new cashier strings must pass the same review as the existing i18n keys. | Add the new keys to `src/lib/i18n.ts` only; no inline strings; the chat surface is English-only and exempt. |
| **"Significantly updated" bar for an existing project** — the rules leave this to the sponsor's sole discretion. | Document the diff: new chat widget, new `Reservation` model, new cashier queue, new PayPal surfaces (Orders v2 + Invoicing + Webhook), new agent service, Render deploy. Put a `## What changed in this submission` section at the top of the README. |
| **Sandbox-to-live confusion** — accidental live charge. | `PAYPAL_ENV=sandbox` in `.env`; the base URL is chosen from it. Live keys never enter the repo. |

---

## Open questions (rules.txt does not answer)

1. **THB in PayPal sandbox.** Can Orders v2 and Invoicing be created in THB on a Thai-registered sandbox merchant, or do we demo in USD with a ฿ display layer? (Risk-table row 1.)
2. **PayPal Agent Toolkit scope.** Is using the Agent Toolkit a hard requirement for the "Best Use of Agentic Commerce" prize, or does any LLM agent that creates a PayPal order/invoice qualify? The rules text just says "Best Use of Agentic Commerce" with no definition.
3. **"Significantly updated" bar.** Rules leave this to the sponsor's "sole discretion." How much of a diff is enough for an existing project? Plan to over-document and assume the bar is moderate.
4. **Demo-link privacy.** Rules say the working demo must be "free for charge and without any restriction" to judges until Dec 15. Does "without any restriction" exclude a paywall, a login, or a geofence? Render + sandbox should be safe; flag if the cashier-side auth needs to be relaxed for judges.
5. **Multiple submissions.** The rules allow more than one submission per entrant if each is "unique and substantially different." Worth confirming whether two AGIS submissions (e.g. Agentic Sales Agent + Smart Pay no-AI) would both be eligible, or whether one would be the primary entry.
