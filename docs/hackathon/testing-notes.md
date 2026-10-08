# AGIS — Judges' Testing Notes

This page is for hackathon judges reviewing AGIS, the Thai gold-shop point-of-sale with an
in-chat reservation flow. Everything below is reachable from a single URL after deploy.

## Live demo

URL: &lt;fill in after deploy&gt;

The free Render instance sleeps after 15 minutes of inactivity. If the page hangs on the
first request after a long pause, give it up to **~1 minute** to wake up and refresh — that
is the instance booting, not a bug. Subsequent loads are instant.

## Sandboxed buyer (PayPal)

Use the PayPal sandbox buyer account on the hosted checkout page to pay the deposit.

- Email: &lt;fill in after deploy&gt;
- Password: &lt;fill in after deploy&gt;

The deposit is **sandbox money**. No real currency moves; PayPal returns a fake transaction
ID and AGIS records it as `PAID`.

## Staff login

The shop-side login uses the demo staff account created on every boot:

- Email: the `DEMO_STAFF_EMAIL` env var configured on Render
- Password: the `DEMO_STAFF_PASSWORD` env var configured on Render

Sign in at `/login`, then open `/reservations` to see the table of recent bookings.

## How reservations and data behave

- The seed script wipes and re-creates `demo.db` on **every boot**, so the catalog and any
  prior reservations are reset when Render redeploys, restarts, or wakes from sleep. Treat
  the live state as ephemeral.
- A `PAID` reservation is held for **48 hours of real time** from creation. After that, the
  staff-side expiry sweep flips it to `EXPIRED` and the held stock returns to the catalog.
- All PayPal orders are created against the PayPal sandbox; nothing reaches a live account.

## End-to-end test script (under 5 minutes)

1. **Browse the catalog.** Open the demo URL. The home page lists every seeded piece with
   live gold-weight prices; the rate updates every few minutes.
2. **Reserve via the public chat.** Open `/reserve` and ask the assistant for a piece by
   name. For example:

   > Do you have a 1 baht gold bracelet?

   The agent should match the seeded "Link Bracelet 1 Baht" (stock 5) and propose it as a
   priced quote card. Pick a quantity and tap **Reserve**. Do not compare or quote prices
   from outside AGIS — they track the live Thai gold bar rate on every page load.
3. **Pay the deposit as the sandbox buyer.** Tap the PayPal button on the quote card. Sign
   in with the sandbox credentials above, confirm the test payment, and return to `/reserve`.
   The chat panel will switch through "confirming with PayPal" to a green **Deposit paid**.
4. **Run the shop side.** In a second tab, sign in at `/login` with the staff credentials
   above. Open `/reservations`. The booking you just paid appears with a **PAID** badge.
5. **Collect the order.** On that row, click **Collect**, choose **Cash**, then mark the
   sale **paid**. The held stock is released and the reservation moves to **COLLECTED**.
6. **(Optional) Force a slow capture.** To see the "confirming with PayPal" pending state,
   temporarily point `PAYPAL_BASE` at a URL that times out or block the outbound capture call
   for one deploy, repeat step 3, and confirm the chat panel still shows the reservation as
   the staff-side row goes into the highlighting state. Restore the variable afterwards.

## Seeded catalog (for reference)

Thirteen pieces across five categories, each with stock >= 2:

| Category        | Item                          | Stock |
|-----------------|-------------------------------|------:|
| Necklaces       | Classic Chain 1 Baht          |   5 |
| Necklaces       | Rope Chain 2 Baht             |   3 |
| Necklaces       | Box Chain 2 Salueng           |   8 |
| Rings           | Plain Band 1 Salueng          |  12 |
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
- **Login fails.** Confirm the credentials match the env vars from the Render dashboard —
  the seed only runs when both `DEMO_STAFF_EMAIL` and `DEMO_STAFF_PASSWORD` are set.
- **Reservation missing from `/reservations`.** The seed wipes state on every boot. If the
  service redeployed between paying and checking, the reservation is gone.
- **PayPal button does nothing.** The sandbox is offline, or `PAYPAL_CLIENT_ID` /
  `PAYPAL_SECRET` are missing from the Render env. Ask for a fresh redeploy.
