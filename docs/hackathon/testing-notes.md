# AGIS — Judges' Testing Notes

This page is for hackathon judges reviewing AGIS, the Thai gold-shop point-of-sale with an
in-chat reservation flow. Everything below is reachable from a single URL after deploy.

## Live demo

URL: https://agis-reserve.onrender.com/

The free Render instance sleeps after 15 minutes of inactivity. If the page hangs on the
first request after a long pause, give it up to **~1 minute** to wake up and refresh —
that is the instance booting, not a bug. Subsequent loads are instant.

**All data resets whenever the instance restarts** — sleep wake-up, manual redeploy, or
code push. Catalog, reservations, the demo staff account, and the sandbox PayPal order
mapping are wiped and re-seeded from scratch on every boot. Treat the live state as
ephemeral.

## Sandboxed buyer (PayPal)

Use the PayPal sandbox buyer account on the hosted checkout page to pay the deposit.

- Email: `<fill in after deploy>`
- Password: `<fill in after deploy>`

The deposit is **sandbox money**. No real currency moves; PayPal returns a fake
transaction ID and AGIS records it as `PAID`.

## Staff login

The shop-side login uses the demo staff account created on every boot:

- Staff email: `<fill in after deploy>`
- Staff password: `<fill in after deploy>`

Sign in at `/login`, then open `/reservations` to see the table of recent bookings.

## How reservations behave

- A `PAID` reservation is held for **48 hours of real time** starting when the deposit is paid. After
  that, the staff-side expiry sweep flips it to `EXPIRED` and the held stock returns to the catalog.
- All PayPal orders are created against the PayPal sandbox; nothing reaches a live account.
- Self-registration is **disabled on the demo**: there is no public sign-up. The staff account is
  seeded by the server on every boot.

## End-to-end test script (under 5 minutes)

1. **Browse the catalog.** Open the demo URL. The home page lists every seeded piece
   with live gold-weight prices; the rate updates every few minutes. The home page
   redirects to `/login`; the public customer side starts at `/reserve`.
2. **Reserve via the public chat.** Open `/reserve` and ask the assistant for a piece by
   name. For example:

   > Do you have a 1 baht gold bracelet?

   The agent should match the seeded "Link Bracelet 1 Baht" (stock 5) and propose it as a
   priced quote card. The customer accepts the quote and gives a name and an email in the
   chat (for example: "Yes please. John Smith. `john@example.com`"); the PayPal button then
   appears below the chat. Do not compare or quote prices from outside AGIS — they are
   derived from the international spot gold price (XAU/USD) converted to THB on every load.
3. **Pay the deposit as the sandbox buyer.** Tap the PayPal button, sign in with the
   sandbox credentials above, confirm the test payment, and return to `/reserve`. The chat
   panel will switch through "confirming with PayPal" to "Deposit paid".
4. **Run the shop side.** In a second tab, sign in at `/login` with the staff credentials
   above. Open `/reservations`. The booking you just paid appears with a **PAID** badge.
5. **Collect the order.** On that row, click **Collect**, choose **Cash**, then confirm the
   sale. The held stock is released and the reservation moves to **COLLECTED**.

## Seeded catalog (for reference)

Thirteen pieces across five categories, each with stock >= 2:

| Category        | Item                          | Stock |
|-----------------|-------------------------------|------:|
| Necklaces       | Classic Chain Necklace 1 Baht |   5 |
| Necklaces       | Rope Chain Necklace 2 Baht    |   3 |
| Necklaces       | Box Chain Necklace 2 Salueng  |   8 |
| Rings           | Plain Band Ring 1 Salueng     |  12 |
| Rings           | Signet Ring 2 Salueng         |   6 |
| Rings           | 18K Solitaire Ring            |   4 |
| Bracelets       | Link Bracelet 1 Baht          |   5 |
| Bracelets       | Bangle 2 Baht                 |   2 |
| Earrings        | Hoop Earrings 1 Salueng       |  10 |
| Earrings        | Stud Earrings 18K             |   7 |
| Bars & Coins    | Gold Bar 1 Baht 96.5%         |  10 |
| Bars & Coins    | Gold Bar 10 g 99.99%          |  10 |
| Bars & Coins    | Gold Bar 1 oz 99.99%          |   4 |

## Troubleshooting during judging

- **First request is slow.** The Render free instance is cold-starting; refresh after a
  minute.
- **Login fails.** Check the staff email and password above.
- **Reservation missing from `/reservations`.** Every state reset wipes prior bookings.
  If the service restarted between paying and checking, the reservation is gone.
- **PayPal button does nothing.** The sandbox is offline or unavailable right now; try
  again, or contact the team.
