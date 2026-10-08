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

**On screen.** The chat shows a quote card: the piece title, the live price in THB, the deposit, and the policy line *"The deposit holds this piece and this price for 48 hours. If it is not collected in time, the deposit is forfeited."* The card is rendered from the server's structured response — never from the model's text.

**Action.** In the chat, the customer accepts the quote and gives a name and an email:
> *"Yes please. John Smith. `john@example.com`"*

**On screen.** The PayPal button appears under the chat.

---

## 0:55 — PayPal deposit (0:55 → 1:20)

**Action.** Click the PayPal button. The sandbox popup opens.

**Voice over.**
> The server confirms the payment with PayPal. No refresh needed.

**On screen.** Sign in as the sandbox buyer, confirm the deposit, return to the chat. The status line under the chat switches to *"Payment received, confirming with PayPal…"*.

**On screen.** A moment later, the status line turns green: *"Deposit paid. Your piece is held for 48 hours — show your name at the counter."*

---

## 1:20 — Staff side, PAID (1:20 → 1:40)

**On screen.** Cut to a new tab. Sign in at `/login` as the demo staff user. Open `/reservations`.

**On screen.** The new booking row: status `PAID`, name, contact, piece, price, deposit, hold-until. The "Collect" button is on the right.

---

## 1:40 — Collect the balance (1:40 → 2:10)

**Action.** Click **Collect** on the PAID row. The collection dialog opens.

**On screen.** The dialog shows the piece price, the deposit paid, and the balance, with **Cash** and **PromptPay** toggle buttons.

**Action.** Click **PromptPay**. The balance appears as a PromptPay QR.

**Action.** Click the **Collect** button at the bottom of the dialog.

**On screen.** The reservation moves to `COLLECTED`. The receipt screen shows price, deposit paid, and balance.

---

## 2:10 — What makes it safe (2:10 → 2:30)

**On screen.** A short split-screen with three captions.

1. **Server-side prices.** The model can never state a price; it comes from the server's pricing function.
2. **One capture, one hold.** PayPal request ids make a retry idempotent. A single-capturer state machine means a second attempt waits for the first.
3. **Holds, not promises.** A reservation is a hold counter on the piece. The unit cannot be sold at the counter while the hold is alive.

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
