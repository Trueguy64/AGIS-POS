---
target: cashier flow (catalog, bag, payment, thank-you, printed slip)
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
target_identity: "file:C:\\Users\\User\\Documents\\Personal Projects\\AGIS-POS\\src\\pages\\ItemSelectionMenu.tsx"
target_fingerprint: "sha256:7de792ea21f0bcfdbe0b3077e1a75e46abb978617cd5ba97deb38e1ab7cf2106"
target_path: "C:\\Users\\User\\Documents\\Personal Projects\\AGIS-POS\\src\\pages\\ItemSelectionMenu.tsx"
timestamp: 2026-10-06T14-49-26Z
slug: src-pages-itemselectionmenu-tsx
closed: true
---
Method: dual-agent (A: design review sub-agent · B: detector/browser sub-agent)

Target: the cashier flow, primary `src/pages/ItemSelectionMenu.tsx`, with bag, payment, thank-you and printed slip in scope.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Rate stamp, stale marker and disabled Continue are strong; bag line prices silently re-price every 60 s and cards never show what is already in the bag |
| 2 | Match System / Real World | 1 | Rate per gram of pure gold, grams only, satang, zero Thai, "Shopping bag / Promo code" vocabulary; the counter speaks per-baht-weight in Thai |
| 3 | User Control and Freedom | 2 | No Escape or focus return on dialogs; Continue locks the rate as a side effect; refresh on /payment/types or /thankyou drops router state |
| 4 | Consistency and Standards | 3 | One slip, one money column, one stamp; thank-you drops the line items the payment receipt shows; print headers "Unit (฿)" with bare numbers vs ฿-prefixed footer |
| 5 | Error Prevention | 2 | Stock-bounded qty and "short ฿x" are good; cash input ungrouped ("200000"), placeholder looks filled, PromptPay Confirm has no gate |
| 6 | Recognition Rather Than Recall | 2 | No "in bag" marker on cards; promo codes typed from memory; lines vanish on thank-you |
| 7 | Flexibility and Efficiency | 2 | Two taps and a modal per piece even at qty 1; search filters only on submit; no quick-cash amounts; category dropdown is mouse-only |
| 8 | Aesthetic and Minimalist Design | 3 | Flat and quiet; the bag receipt is ~450px of white at 1440; "Store editor" is the loudest control in a cashier's rail |
| 9 | Error Recovery | 3 | Plain-language role="alert" notes; a failed first rate fetch shows "Rate loading…" forever |
| 10 | Help and Documentation | 3 | "at ฿x per gram of pure gold" and the printed formula are the right in-place help; the XAU/USD tooltip is hover-only |
| **Total** | | **24/40** | **Acceptable** |

## Design Specificity Verdict

**LLM assessment:** half-authored. The visual world is unmistakably a Thai gold counter: the red rubber-stamp rate that lives in the bar, strikes the receipt at -2° when the rate locks and prints on the slip; the honest derivation shown at the point of decision ("฿33,702.01 at ฿4,522.05 per gram of pure gold"); PromptPay with the Thai QR band; refusing to sell until a rate exists. Underneath it, the information model is a generic SKU cart with the price formula swapped: the signature stamp quotes ฿ per gram of pure gold when every customer asks "บาทละเท่าไหร่" (per baht-weight), weight is grams only, prices carry satang on ฿180k tickets, there is no Thai string anywhere despite the Thai font being loaded, and the bag is e-commerce vocabulary ("Shopping bag", "Promo code", "× n", "n left"). The photo-first card grid is a retail catalogue; for gold, weight and purity are the discriminators and they sit in 15px soft ink under a 200px photo.

**Deterministic scan:** the CLI detector returned 0 findings over all 19 cashier-flow files (validated against a canary that produced 3). In-browser injection on four live routes logged three rule hits, all discounted: `cream-palette` on `<body>` is the declared `--color-paper` token (oklch(96.5% 0.028 88) → rgb(251,243,223)), `nested-cards` is the rate stamp inside the receipt header, a declared system device, and `dark-glow #ffba00` was the detector's own overlay shadow persisting across SPA navigation (absent on single-injection runs and absent from the pre-injection DOM). Zero console or page errors on any route. Where the two assessments meet: the detector caught nothing the review missed, and the review's issues (units, language, legibility, the lock, recording) are all beyond a pattern scanner's reach.

**Visual overlays:** injection succeeded in the scripted browser, but that browser was headless, so no overlay tab is open for you to look at. The console output is summarized above; the live overlay server was stopped.

## Overall Impression

The surface looks like the shop and behaves like a web store. The stamp is the best idea in the product and it is carried through properly; the numbers around it are in the wrong unit, the wrong precision and the wrong language for the people PRODUCT.md names. The single biggest opportunity is to make the stamp say the number the counter actually asks for, per baht-weight in Thai, and let the rest of the copy follow.

## What's Working

1. **The rate stamp as one carried-through signature.** One component owns the live figure, stale state, lock and print. The live stamp and the struck stamp share the receipt header slot, so locking is a visible state change in place. Per-character roll-in means a refresh moves only the digits that moved, which is how a cashier perceives a ticking rate.
2. **Honest derivation at the point of decision.** The buy dialog recaps weight, purity, labor fee and the rate before "Add to bag"; each printed line carries its weight · purity · labor; the slip ends with the formula. Every number on the receipt can be audited from the stamped rate.
3. **Disciplined money handling.** One right-aligned tabular money column on every receipt-like surface, `thb()` everywhere, promo in stamp red with a leading minus, change in green only. Totals line up on screen and on paper.

## Priority Issues

- **[P0] The sale is never recorded and stock never decrements.** Confirm payment navigates with router state and calls no API; no sales route exists and `adjustStock` is never called from the cashier flow. **Why it matters:** a refresh or closed tab after "Paid. Thank you." leaves the sold pieces in the bag and in stock; two branches cannot share stock; the locked rate and the receipt exist only as a `window.print()`. **Fix:** POST a sale on Confirm (lines, rate, lockedAt, payment, amount, cashier), decrement stock in the same transaction, render thank-you and the slip from the saved sale by id, show that id on the slip. **Suggested command:** /impeccable harden.
- **[P1] The rate lock is unannounced before it happens and fragile after.** "Continue to payment" both navigates and freezes the rate; nothing says "lock"; refreshing the payment page drops the lock and the red cancel silently un-locks. **Why:** the lock is the one promise the shop makes the customer. **Fix:** label the button "Lock rate ฿x /g and continue", strike the stamp on the bag receipt before navigating, persist the lock in session or the sale draft, and ask "keep locked / relock" when a lock is old at Confirm. **Suggested command:** /impeccable clarify, then /impeccable animate.
- **[P1] Money is not legible at arm's length.** Every line price, card price, Subtotal, Paid and Change are 15px; only Total and the stamp are 28px, because the Two Sizes Rule forces it. **Why:** PRODUCT.md's whole scene is a customer reading across a counter. **Fix:** add a customer-facing money size (around 1.25rem) for card prices, bag line totals and the cash dialog, and amend the Two Sizes Rule in DESIGN.md rather than break it silently. **Suggested command:** /impeccable typeset.
- **[P1] Units and language do not match the counter.** Rate per gram of pure gold, grams only, satang on every price, no Thai, "Oct 06, 07:01 PM" on the printed slip. **Why:** the cashier translates every figure and every sentence aloud, which is the work the design claims to remove. **Fix:** stamp reads "ทองรูปพรรณ ฿xx,xxx /บาท" with per-gram on a second line; `describeGold` adds baht/salueng; displayed prices round to whole baht (store satang); Thai labels first for the ~40 cashier strings using the loaded Noto Sans Thai; 24h and Buddhist-era dates on the slip. **Suggested command:** /impeccable clarify, then /impeccable harden for the i18n layer.
- **[P2] Cash entry invites a zero slip.** The cash field shows ungrouped digits ("200000"), its placeholder is the total in muted ink, and 2000000 would show ฿1.8M change in green. **Fix:** group digits live while typing, empty placeholder, and quick buttons for exact and the next round ฿10k/฿100k. **Suggested command:** /impeccable harden.

## Persona Red Flags

**Alex (impatient power user):** every piece costs a card tap plus a modal even at qty 1; search filters only on submit and never matches weight or purity; no quick-cash amounts; no "Print and start new sale".

**Sam (screen reader, keyboard only):** neither dialog traps focus, handles Escape or returns focus on close; `itemCard`'s aria-label overrides the content so the price is not in the accessible name; the search dropdown is `<li onMouseDown>` with no role or arrow keys; the cashier rail has no `aria-pressed` (the editor rail does); the collapsed phone rail keeps nine focusable buttons in the tab order; the hamburger has no `aria-expanded`.

**Casey (one-handed phone user):** the stamp drops its "Rate" label on phones so the red block reads "฿4,522.05 /g" with no noun; the Checkout block covers the bottom-right card's price; the receipt and Continue sit below the fold on the bag; the cash dialog's Confirm will sit under the keyboard.

**Ploy (Thai-first cashier, customer at the counter):** every sentence is English to be translated aloud; the stamp answers a question nobody asks (per gram, not per baht); "15.244 g · 96.5%" where she thinks "1 บาท"; satang she will round by hand; the PromptPay QR is generated from her personal phone number and the empty state tells her to add one in Settings, routing shop revenue into a staff account.

## Minor Observations

- Catalog says "Checkout · 4" while the bag says "5 pieces": two `useState` copies of the cart can disagree within a session.
- `PromoCard` formats ฿ without decimals while everything else uses `thb()`; print headers "Unit (฿)" with bare numbers versus the ฿-prefixed footer.
- The promo input sits inside the receipt's reading flow between Subtotal and Total.
- Thank-you puts the stamp above the title on phones and beside it on desktop; one hierarchy should win.
- `page=1` is written to the URL with no pagination on the catalog; `whitespace-nowrap` on rail rows will clip long Thai category names.
- The printed slip leaks role and database id ("Manager, #1") and has no shop name, branch, receipt number or Buddhist-era date; cards show "5 left" to the customer, which reads as pressure.
- A failed first rate fetch shows "Rate loading…" indefinitely; a cleared quantity field submits as 1 silently.
- In the print capture the Qty digit "1" renders blue in three rows: check a real print.

## Questions to Consider

- If the stamp said "ทองรูปพรรณ ฿71,860 /บาท" with per-gram on the second line, how many of the copy and legibility problems dissolve at once?
- What if the bag were one weigh-slip instead of two panels, so the screen could be turned to the customer and read as a document?
- Does a gold counter need a photo-first grid at all, when 90% of sales are by weight class (1 salueng, 2 salueng, 1 baht, 2 baht)?
- Who should hold the rate lock, the browser tab or the shop? A sale draft on the server with a locked rate and a number resolves the receipt, the stock, the refresh and multi-branch reporting in one decision.
