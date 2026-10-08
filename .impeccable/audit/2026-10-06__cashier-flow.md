# Audit: cashier flow (catalog → bag → lock → pay → receipt)

Date: 2026-10-06 · Target: `src/pages/ItemSelectionMenu.tsx` and the selling path it leads into · Method: source review, `impeccable detect src` (0 findings), Playwright walk at 1440×900 and 390×844 plus print emulation (captures in `.impeccable/review/`), `tsc -b` and `eslint` clean.

## Audit Health Score

| # | Dimension | Score | Key Finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 3 | Rate popover (`<details>`) has no Escape or outside-click dismissal |
| 2 | Performance | 3 | Catalog images are not lazy-loaded; whole inventory is fetched client-side |
| 3 | Responsive Design | 3 | Sticky receipt footer covers the receipt header on first scroll on phones |
| 4 | Theming | 3 | One hard-coded hex in the PromptPay QR; no dark theme by design |
| 5 | Implementation Integrity | 4 | Detector clean; one system, tokens and shared Dialog everywhere |
| **Total** | | **16/20** | **Good (address weak dimensions)** |

## Implementation Integrity Verdict

**Pass.** The selling path expresses one product-specific system: gold-paper ground, white slips with brass edges, a single red rate stamp, three type sizes, one money column, Thai-first labels from one string table, and one `Dialog` component behind every modal. `impeccable detect` over `src` reports no findings. The only drift is cosmetic: three components index `S[...]` directly for inline English where `Bi` would do (P3).

## Executive Summary

- Audit Health Score: **16/20** (Good)
- Issues: P0 0 · P1 1 · P2 6 · P3 5
- Top issues:
  1. **[P1] Thai copy is unreviewed.** Every Thai string was written by the build. A wrong word on a money screen misleads staff and customers. Needs a native speaker's pass over `src/lib/i18n.ts` before shop use.
  2. **[P2] Rate popover dismissal.** The native `<details>` stamp stays open until re-tapped; Escape and clicking elsewhere do nothing.
  3. **[P2] Sale recording is not idempotent.** `createSale` is guarded against double-click by `pending`, but a timed-out request that actually succeeded will be retried and recorded twice.
  4. **[P2] Sticky receipt footer on phones** pins the Lock button over the receipt header the moment the receipt scrolls into view.
  5. **[P2] Images not lazy.** Card photos load eagerly; fine for 13 pieces, not for a real catalog.
- Next: `/impeccable harden` (idempotency key, popover dismissal), `/impeccable adapt` (sticky footer, phone search width), `/impeccable optimize` (lazy images, server-side filtering), then `/impeccable polish`.

## Detailed Findings by Severity

### P1

**[P1] Thai strings written by the build, not reviewed**
- Location: `src/lib/i18n.ts` (whole table)
- Category: Accessibility (comprehension) / Implementation Integrity
- Impact: Thai is the leading language on every label, button and printed receipt. An awkward or wrong term on a money surface costs trust at the counter.
- Standard: WCAG 3.1.2 (language of parts) is met via `lang`; the risk is correctness, not markup.
- Recommendation: Native-speaker review of all ~75 keys in one sitting; terms to confirm first: ล็อกราคาแล้วชำระเงิน, ค่ากำเหน็จ, ยอดสุทธิ, พอดี, ขาดอีก, ทองรูปพรรณ.
- Suggested command: `/impeccable clarify`

### P2

**[P2] Rate popover has no Escape / outside-click dismissal**
- Location: `src/components/RateStamp.tsx` (`<details>` around the summary)
- Category: Accessibility
- Impact: Keyboard users must Tab back to the summary and press Enter to close; the open panel can sit over the catalog's first row.
- Standard: WCAG 1.4.13 (content on hover or focus: dismissible)
- Recommendation: Add a `keydown` Escape handler and a document `pointerdown` listener that closes the `<details>` when the target is outside it.
- Suggested command: `/impeccable harden`

**[P2] Sale POST is not idempotent**
- Location: `src/components/PromptQR/PaymentPortal.tsx` (`handleSubmit`), `server/src/routes/sale.ts`
- Category: Implementation Integrity
- Impact: If the request times out after the server committed, the cashier's retry records a second sale and decrements stock twice.
- Recommendation: Generate a client `saleKey` (UUID) when the lock is taken, store it with the lock, send it as `Idempotency-Key`, add a unique column on `Sale`, and return the existing sale on a repeat.
- Suggested command: `/impeccable harden`

**[P2] Sticky receipt footer covers the header on phones**
- Location: `src/components/PaymentCalculation/Receipt.tsx` (footer `sticky bottom-0 md:static`)
- Category: Responsive
- Impact: On a 390px phone, as the receipt slip scrolls into view the Lock button is already pinned to the viewport bottom and overlaps the "ใบเสร็จ Receipt" header and stamp until the user scrolls further. Functional, but the first impression is a collision (see `mobile-bag-receipt.png`).
- Recommendation: Either reserve the footer's height as bottom padding on the receipt body on phones, or pin the Lock button to the page (fixed) only while the receipt header is above the fold, using an `IntersectionObserver`.
- Suggested command: `/impeccable adapt`

**[P2] Phone search pill is squeezed by the labelled stamp**
- Location: `src/components/mainWeb/NavBar.tsx`, `RateStamp.tsx` (stacked label on `<sm`)
- Category: Responsive
- Impact: At 390px the search input shows about 14 characters ("ค้นหาสินค้า · Sear"); tag chips make it narrower still.
- Recommendation: On `<sm`, hide the search icon button (submit on Enter) or move search to a second row under the bar when chips are present.
- Suggested command: `/impeccable adapt`

**[P2] Catalog images load eagerly and the whole inventory is fetched**
- Location: `src/components/mainWeb/itemCard.tsx` (`<img>`), `src/pages/ItemSelectionMenu.tsx` (`getInventory()` then client-side filter)
- Category: Performance
- Impact: Every photo on every card downloads on first paint; the search and category filters run over the full list on each render. Invisible at 13 pieces, costly at a few hundred with real photos.
- Recommendation: `loading="lazy" decoding="async"` on card images; move search/category filtering to the inventory endpoint (it already accepts query params for the editor's paginated list).
- Suggested command: `/impeccable optimize`

**[P2] Muted ink contrast not measured**
- Location: `--color-ink-muted` uses in `Bi` inline English, card meta lines, print headers
- Category: Accessibility
- Impact: If muted ink on the white slip or gold paper falls under 4.5:1, the English half of every label fails AA.
- Standard: WCAG 1.4.3
- Recommendation: Measure `ink-muted` on `slip` and on `paper`; if under 4.5:1, nudge the token darker rather than touching components.
- Suggested command: `/impeccable audit` (re-run with contrast tooling) then `/impeccable polish`

### P3

**[P3] Hard-coded QR foreground colour** · `src/components/PromptQR/PromptQR.tsx` (`fgColor="#1F1A14"`) · Theming · Use the ink token's hex or read it from `getComputedStyle` once. `/impeccable polish`

**[P3] Printed item sub-line wraps** · `Printables/PrintableItems.tsx` · Responsive (print) · With Thai weight added, the `weight · grams · purity · ค่ากำเหน็จ ฿800` line wraps for long titles; drop the labor fee to its own muted line or widen the Item column by shrinking Qty to `w-12`. `/impeccable typeset`

**[P3] Live stamp figure is `aria-live="polite"`** · `RateStamp.tsx` · Accessibility · Announces every minute when the rate ticks; consider announcing only when the figure changes by more than a threshold, or drop live and rely on the stamp's label. `/impeccable harden`

**[P3] Raw `S[...]` indexing beside `Bi`** · `Receipt.tsx`, `PaymentThankYou.tsx`, `PrintableReceipt.tsx` · Implementation Integrity · Three places build inline English with `S.key[1]` where `<Bi>` would do; one pattern is easier to review. `/impeccable polish`

**[P3] `page=1` reset on every search** · `SearchBar.tsx` · Implementation Integrity · The catalog page does not paginate; the param is harmless but dead. Keep only if the editor shares the component. `/impeccable distill`

## Patterns & Systemic Issues

- **Phone chrome is at capacity.** Bar (hamburger + search + labelled stamp) and receipt header (stacked title + stamp) are both at the edge of 390px. Any new element in either needs a wrap rule first.
- **Network retries are the only unguarded path.** Every button on the money path is disabled while pending, but nothing survives a request that succeeded after the client gave up.

## Positive Findings

- One `Dialog` with focus trap, Escape, scrim click, focus return and bottom-sheet layout serves buy, cash, PromptPay, editor and delete-confirm.
- Server recomputes every unit price from the locked rate and checks stock in a transaction; the client cannot post a price.
- Rate lock, promos and cart survive refresh; the payment page redirects to the bag if the lock is missing.
- Keyboard-complete search combobox (`role="combobox"`, arrow keys, `aria-activedescendant`), `aria-pressed` on rail rows, `aria-expanded` on the hamburger, `inert` on the collapsed rail.
- `prefers-reduced-motion` removes both stamp motions and skips the strike delay before navigation.
- Money is whole baht everywhere; the per-gram figure appears only as the formula input.
- `tsc`, `eslint` (react-hooks purity and set-state-in-effect rules on) and `impeccable detect` are all clean.

## Recommended Actions

1. **[P1] `/impeccable clarify`**: native-speaker review pass of `src/lib/i18n.ts`, then re-walk the flow for label length.
2. **[P2] `/impeccable harden`**: idempotency key on `createSale`; Escape/outside-click on the rate popover; quieter `aria-live` on the live stamp.
3. **[P2] `/impeccable adapt`**: phone receipt footer collision; phone search width with the labelled stamp.
4. **[P2] `/impeccable optimize`**: lazy card images; server-side catalog filtering.
5. **[P3] `/impeccable polish`**: QR colour token, raw `S[...]` to `Bi`, print sub-line, dead `page` param.
