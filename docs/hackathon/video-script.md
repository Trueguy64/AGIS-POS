# AGIS — Demo video script (< 3 minutes)

Target: PayPal AI Hackathon judges. English. Public YouTube upload; link in the Devpost form and the README.

> **Visual language.** Browser tab, full screen, cursor moves with intent, no narration of code or names. Every on-screen action is a real click on the live demo URL from [testing-notes.md](testing-notes.md). All copy is on the screen, in chat bubbles and quote cards, in plain English. Prices and the gold rate are whatever the live demo shows on the day.

---

## 0:00 — The problem (0:00 → 0:20)

**On screen.** Title card: *"AGIS — agentic gold POS"*. Fade to the live demo URL.

**Voice over.**
> Gold prices move every minute, so a noon quote is rarely a three o'clock price. A local customer pays cash or PromptPay at the counter. A tourist, expat, or online buyer cannot — they want a price, and they want the shop to hold the piece until they collect.

---

## 0:20 — Chat to a live quote (0:20 → 0:55)

**On screen.** Open the public `/reserve` page. The chat is already opened with a friendly opening line.

**Action.** Type:
> *"Do you have a 1 baht gold bracelet?"*

**Voice over.**
> A customer opens the public reserve page and chats in English with the AGIS assistant. They type what they want. The chat shows a quote card with the piece, the live price in Thai baht, a 10% PayPal deposit, and the policy line — the deposit holds the piece and the price for 48 hours. The card is rendered from the server's structured response. The customer accepts in the chat, gives a name and an email, and the PayPal button appears.

**On screen.** The quote card, the chat reply, and the PayPal button under the chat.

---

## 0:55 — PayPal deposit (0:55 → 1:20)

**Action.** Click the PayPal button. The sandbox popup opens.

**Voice over.**
> They click the PayPal button. The sandbox popup opens. They sign in as the sandbox buyer, confirm the deposit, and return to the chat. The status line under the chat switches to: payment received, confirming with PayPal. A moment later it turns green: deposit paid, your piece is held for 48 hours, show your name at the counter.

**On screen.** The PayPal popup, the sandbox sign-in, the confirmation, the chat status line switching through "Payment received, confirming with PayPal…" to the green "Deposit paid" line.

---

## 1:20 — Staff side, PAID (1:20 → 1:40)

**On screen.** Cut to a new tab. Sign in at `/login` as the demo staff user. Open `/reservations`.

**Voice over.**
> Back in the shop, the staff user signs in and opens the reservations page. The new booking appears in the list: status PAID, customer name, contact, the piece, price, deposit, and the hold-until time. The Collect button is on the right.

**On screen.** The new booking row in the staff `/reservations` list.

---

## 1:40 — Collect the balance (1:40 → 2:10)

**Action.** Click **Collect** on the PAID row. The collection dialog opens.

**Voice over.**
> The staff clicks Collect on the PAID row. A dialog opens showing the piece price, the deposit paid, and the balance, with Cash and PromptPay toggle buttons. The customer chooses PromptPay, and the balance appears as a PromptPay QR. They click Collect. The reservation moves to COLLECTED, and the receipt shows the price, the deposit, and the balance — the same way any local customer would pay.

**On screen.** The collection dialog, the PromptPay QR, the final receipt.

---

## 2:10 — What makes it safe (2:10 → 2:30)

**Voice over.**
> Three things make this safe. The server sets every price; the model can never state one. One capture per payment, with a request id so a retry cannot double-charge. Holds are released exactly once, and the captured amount is checked against the deposit.

**On screen.** Three short captions, one per point:

1. **Server sets every price.** The model can never state a price; it comes from the server's pricing function.
2. **One capture per payment.** PayPal request ids make a retry idempotent. A single-capturer state machine means a second attempt waits for the first.
3. **Holds released exactly once.** The hold counter is decremented in the same transaction as the status change, so it cannot run twice.

---

## 2:30 — Close (2:30 → 2:40)

**On screen.** Title card again. Below: the demo URL, the testing-notes link, and the placeholder for the YouTube link.

**Voice over.**
> AGIS — agentic gold POS. PayPal is the only way to reserve; the AI is the only way to ask. Built for the PayPal AI Hackathon.

---

**Run time.** ~2 min 40 s.

**Recording checklist.**
- Use the live Render demo URL from `testing-notes.md`, not localhost.
- Sign in to PayPal as the sandbox buyer listed in the testing notes.
- Keep the customer's name and email consistent across the chat and the staff page.
- Stop the recording the moment the close card appears; no after-credits.
- Upload as **public** on YouTube; paste the URL into the Devpost form and into the README where it says `<YouTube link after upload>`.
