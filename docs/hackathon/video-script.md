# AGIS — Demo video script (< 3 minutes)

Target: PayPal AI Hackathon judges. English. Public YouTube upload; link in the Devpost form and the README.

> **Visual language.** Browser tab, full screen, cursor moves with intent, no narration of code or names. Every on-screen action is a real click on the live demo URL from [`docs/hackathon/testing-notes.md`](../hackathon/testing-notes.md). All copy is on the screen, in chat bubbles and quote cards, in plain English. Prices and the gold rate are whatever the live demo shows on the day.

---

## 0:00 — The problem (0:00 → 0:25)

**On screen.** Title card: *"AGIS — agentic gold POS"*. Fade to the live demo URL.

**Voice over.**
> A Thai gold shop has a real problem. Gold prices move every minute, and a piece quoted at noon might be a different price at three. The local customer pays cash or PromptPay at the counter and walks out with the piece. But a tourist, an expat or an online buyer cannot — they see a photo online, they want a price, and they want the shop to hold the piece for them while they arrange to collect. Today, the shop has no way to do that.

**On screen.** A static mockup of a piece with the price moving minute by minute; an arrow from the piece to a customer abroad.

---

## 0:25 — Chat to a live quote (0:25 → 1:05)

**On screen.** Open the public `/reserve` page. The chat is already opened with a friendly opening line.

**Voice over.**
> A customer opens the public reserve page and chats in English with the AGIS assistant.

**Action.** Type:
> *"Do you have a 1 baht gold bracelet?"*

**Voice over.**
> The assistant searches the catalog, finds a match, and offers it as a quote card with the live price and a 10% PayPal deposit.

**On screen.** The chat shows a quote card: the piece title, the live price in THB, the deposit amount, the currency, and the policy line *"The deposit holds this piece and this price for 48 hours. If it is not collected in time, the deposit is forfeited."* The quote card is rendered from the server's structured response — never from the model's text.

**Action.** In the chat, the customer accepts the quote and gives a name and an email:
> *"Yes please. John Smith. [email protected]"*

**On screen.** The PayPal button appears under the chat.

---

## 1:05 — PayPal deposit (1:05 → 1:30)

**Action.** Click the PayPal button. The sandbox popup opens.

**Voice over.**
> They pay the 10% deposit through PayPal's sandbox — a real Orders v2 call, with a request id so a retry cannot double-charge.

**On screen.** Sign in as the sandbox buyer, confirm the deposit, return to the chat. The status line under the chat switches to *"Payment received, confirming with PayPal…"* as the page polls.

**Voice over.**
> The customer does not need to refresh. `/reserve` polls the same capture endpoint — safe to repeat, and it can take over a stale claim if the customer's first attempt drops.

**On screen.** A moment later, the status line turns green: *"Deposit paid. Your piece is held for 48 hours — show your name at the counter."*

---

## 1:30 — Staff side, PAID (1:30 → 1:50)

**On screen.** Cut to a new tab. Sign in at `/login` as the demo staff user. Open `/reservations`.

**Voice over.**
> Back in the shop, the booking appears on the staff reservations page. PAID, with the customer's name, the piece, the price, the deposit and the hold-until time.

**On screen.** The row for the new reservation: status `PAID`, name, contact, piece, price, deposit, hold-until. The "Collect" button is on the right.

**Voice over.**
> Note the badge: a piece that has no available units because of a hold shows a "Reserved" badge on the till, and the buy action uses available units only — two customers cannot hold the last piece.

---

## 1:50 — Collect the balance (1:50 → 2:20)

**Action.** Click **Collect** on the PAID row. The collection dialog opens.

**On screen.** The dialog shows the piece price, the deposit paid, and the balance, with **Cash** and **PromptPay** toggle buttons.

**Action.** Click **PromptPay**. The balance appears as a PromptPay QR.

**Voice over.**
> The customer walks in and pays the balance at the counter, the same way any local customer does — cash, or PromptPay. The reservation is collected in one transaction: the hold is released, the stock goes down by one, and the reservation moves to COLLECTED.

**Action.** Click the **Collect** button at the bottom of the dialog.

**On screen.** The reservation disappears from the list (or moves to a small COLLECTED section if shown). The receipt screen displays price, deposit paid, and balance.

---

## 2:20 — What makes it safe (2:20 → 2:45)

**On screen.** A short split-screen with three panels and small captions.

**Voice over.**
> Three things make this safe.

1. **Server-side prices.** The model can never state a price — the price comes from the server's pricing function, and the deposit is computed from it. The frontend only renders what the server hands it.
2. **One capture, one hold.** The PayPal request ids make a retry idempotent. A single-capturer state machine means a second attempt waits for the first to finish; a stale claim is taken over, never duplicated.
3. **Holds, not promises.** A reservation is a hold counter on the piece, not a note. The unit cannot be sold at the counter while the hold is alive, and a payment is never silently released.

**On screen.** Each bullet highlights the relevant line of the rendered UI for a moment.

---

## 2:45 — Close (2:45 → 2:55)

**On screen.** Title card again. Below: the demo URL, the testing-notes link, and the placeholder for the YouTube link.

**Voice over.**
> AGIS — agentic gold POS. PayPal is the only way to reserve. The AI is the only way to ask. Built for the PayPal AI Hackathon.

---

**Run time.** ~2 min 55 s.

**Recording checklist.**
- Use the live Render demo URL from `docs/hackathon/testing-notes.md`, not localhost.
- Sign in to PayPal as the sandbox buyer listed in the testing notes.
- Keep the customer's name and email consistent across the chat and the staff page.
- Stop the recording the moment the close card appears; no after-credits.
- Upload as **public** on YouTube; paste the URL into the Devpost form and into the README where it says `<YouTube link after upload>`.
