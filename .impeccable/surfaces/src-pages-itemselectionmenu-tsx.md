---
version: 1
slug: "src-pages-itemselectionmenu-tsx"
primary_target: "src/pages/ItemSelectionMenu.tsx"
related_targets: ["src/pages/PaymentCalculation.tsx","src/pages/SelectPaymentType.tsx","src/pages/PaymentThankYou.tsx"]
---

# Surface brief: cashier flow (catalog → bag & receipt → payment → thank-you)

Primary target: `src/pages/ItemSelectionMenu.tsx`. Related: `src/pages/PaymentCalculation.tsx`, `src/pages/SelectPaymentType.tsx`, `src/pages/PaymentThankYou.tsx` and the components they render.

## Scope and mode

Operate. A production-ready replacement of the cashier flow's visual world. The route map, checkout math, promo logic, Cash/PromptPay behaviour and every field on the printed receipt are preserved. Manager editor, auth and settings follow later in the same world.

## Audience, job, proof

A cashier or manager at a Thai gold-shop counter with a customer present, on a landscape tablet or desktop under bright shop light. Job: sell pieces at the live price in a handful of taps. Proof: the rate is visible on every screen, locked when Continue is pressed, and printed on the receipt with its time beside each piece's weight, purity and labor fee.

## Constraints

Vite + React 19 + Tailwind 4. Designed for bilingual Thai / English (label widths, Thai line height, a face with Thai glyphs) but shipped with English strings. Text on gold paper meets 4.5:1. Tap targets ≥ 40px. Product photos are supplied by the shop later; placeholder stays. No shop name, no bilingual copy, no logo mark is to be invented: a typographic AGIS wordmark stands in for the mark until one exists.

## Direction contract

THESIS: Every screen is the carbon-copy weigh slip the shop already hands over: white slips on a gold-paper counter, money in one strict tabular column, and the live rate struck as a red rubber stamp. It refuses the category's white-cards-plus-one-accent shell and the dark luxury-boutique opposite.

OWN-WORLD: Pale gold paper ground; matte brass for the top bar, buttons and emphasis; white slip panels with a 1px brass-tinted edge and 6px corners; warm near-black ink with two softer steps; stamp red for the rate stamp and errors only. A Thai-native workhorse sans at two sizes only (compact, display), figures always tabular, rank by weight and case. No shadows, no gradients, no ruled lines in tables. Lucide icons at one stroke.

STORY: The cashier sees today's rate the moment the screen loads, picks pieces whose prices visibly descend from it, watches the stamp strike the receipt when the rate locks, and hands over a printed slip that shows the same stamp.

FIRST VIEWPORT (catalog, 1440×900): a 64px brass top bar with the AGIS wordmark left, a white search pill filling the middle, and the rate stamp at the right: red double-bordered block, RATE in small caps, ฿4,506.81 /g at display size, time beneath. Below: a 256px white category rail with brass-tinted emoji badges and a brass-tint selected row; a gold-paper field of white slip cards that repack in whole cells (photo well, title, 15.244 g · 96.5%, price right-aligned in deep brass); a brass Checkout block anchored bottom right. Signature move: the rate stamp; its digits roll in place on refresh and it strikes onto the receipt on Continue. Raises: two type sizes only (Timetable); one money column (J-Card); nothing labeled twice (Factory sleeve); whole-cell repacking (Convention catalog).

FORM: The Gold Slip, candidate 4 of 7 on the ordered grounded list; seed key 2094a5d4; code-led.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Memorable moment

The stamp striking the receipt as the rate locks.

## Unresolved

Thai face resolved by measurement: Sarabun and Anuphan carry no tnum feature, so the build self-hosts Noto Sans (tabular figures) with Noto Sans Thai for Thai glyphs. Stale-rate threshold for the stamp's STALE marker. Whether the receipt perforation survives print.
