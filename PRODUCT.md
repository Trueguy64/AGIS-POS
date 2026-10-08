# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Counter staff and managers at a small chain of gold shops in Thailand, working across several branches. Staff rotate between branches, so the same person meets the same screens in different shops.

- **Cashier (role: Employee):** sells at the counter with a customer waiting. Picks pieces from the catalog, builds a cart, applies a promo code, takes Cash or PromptPay, prints a receipt. Needs today's gold rate visible at all times because customers ask for it and because every price on screen derives from it.
- **Manager (role: Manager):** maintains the catalog (pieces, weight, purity, labor fee, stock, photo), categories and promo codes, and can also sell.

Device: counter screens, tablets and desktops, mostly landscape. Mobile use is secondary but the layout must not break there.

## Product Purpose

A point of sale for gold shops where no item has a fixed price. Every piece is priced live as weight × purity × today's gold rate (THB per gram of pure gold) + a fixed labor fee per piece. The product exists so staff never compute gold prices by hand or re-tag stock when the market moves, and so a customer sees the same price logic the shop uses.

Success: a sale completes in a few taps with the correct live price, the rate used is locked and printed on the receipt, and inventory and catalog edits by managers are reflected immediately for cashiers.

## Positioning

Price is derived, never stored. A generic POS stores a price per SKU and asks staff to re-price when gold moves; this one stores weight, purity and labor fee and derives the price from the live rate at the moment of sale, then freezes that rate onto the receipt. Thai jewelry units (salueng, baht weight) and purities (96.5% Thai standard, 99.99% bullion, 18K, 14K) are first-class.

## Operating Context

- A shop counter with a customer present; speed and legibility at arm's length matter more than density.
- Gold rate feed: Swissquote XAU/USD × ECB USD/THB (Frankfurter), fetched server-side and cached 60 seconds. The rate shown is a market spot derivative, not the Thai Gold Traders Association board price; shops may want a manual override later (undecided).
- Payment: Cash with change calculation, or Thai PromptPay QR for the shop's PromptPay ID (`PROMPTPAY_ID` in `server/.env`), falling back to the logged-in staff member's phone when the shop ID is unset.
- Sales are recorded: `Sale` / `SaleLine` hold the locked rate, cashier, payment, amounts, promo codes and per-line unit prices recomputed server-side; stock decrements in the same transaction; the receipt number is the zero-padded sale id.
- Receipts are printed from the browser (`window.print`) on a standard printer; thermal receipt printers are not supported yet (undecided).
- Authentication: email + password, JWT cookie, roles Manager and Employee.
- Images for catalog pieces are uploaded by managers (JPEG/PNG/WEBP, 5 MB max). Most seeded items currently use a placeholder image.

## Capabilities and Constraints

Confirmed functionality:

- Catalog of gold pieces with title, category, weight (grams), purity (fraction), labor fee (THB), stock, image, optional description.
- Cart with quantities bounded by stock, promo codes (percent or fixed value), subtotal / promo / total, locked gold rate on checkout.
- Checkout via Cash or PromptPay; thank-you screen; printable receipt listing weight, purity, labor fee, unit price, quantity, rate used, cashier, payment method, timestamp.
- Manager editor for items, categories (name + emoji symbol) and promo codes; staff profile with name, email, phone.
- Search and category filtering of the catalog, state held in the URL.

Technical constraints:

- Vite + React 19 + Tailwind 4 frontend; Express 5 + Prisma 7 + SQLite backend in `server/`; dev server proxies `/api` and `/uploads` so the app is same-origin.
- Single SQLite database and a single inventory today. **Multi-branch is the intended product shape but is not modelled yet**: there is no branch entity, no per-branch stock, no branch on receipts or users. Open decision: shared catalog with per-branch stock, or fully separate inventories.
- **Language: bilingual Thai / English is required.** Decided 2026-10-06: Thai-first with English alongside on every screen and on the printed receipt, Latin digits, no language switch. All strings live in `src/lib/i18n.ts`. **The Thai copy was written by the build, not by a native speaker; it must be reviewed by Thai counter staff before shop use.**
- Currency is THB only. Weights are grams in data; staff think in salueng (3.81 g) and baht weight (15.244 g jewelry, 15.16 g bar); every gold description leads with the Thai weight when the grams match one, and the rate is quoted per baht-weight of 96.5% ornament gold (per gram pure gold is shown as the formula input). Prices are rounded to whole baht.

Terminology: *rate* = THB per gram of pure gold; *labor fee* = ค่ากำเหน็จ, the fixed making charge per piece; *purity* = fraction of pure gold; *salueng* and *baht* = Thai weight units.

## Brand Commitments

- Name: **AGIS** (the GitHub README reads "AGIS-POS — A POS system for Gold Stores in Thailand"). The expanded name is not decided.
- AGIS is its own brand. The ASIS logo and favicon currently in `src/assets/` are placeholders inherited from the upstream CSC105 project and **are to be replaced**; future work may propose a new mark and name treatment. Until a mark exists, the ASIS SVG stays in place so screens are not left blank.
- No voice, tagline, colors or typography have been made binding.

## Evidence on Hand

- Working application with 13 seeded gold pieces across 5 categories (`server/src/prisma/seed.ts`); realistic Thai weights and labor fees, but sample data, not a real shop's catalog.
- Live gold rate endpoint `GET /api/gold` returning real market numbers.
- Placeholder product image only (`server/uploads/placeholder.png`); no real product photography.
- PromptPay and Thai QR logos in `src/assets/PromptQR/`.
- No real customer, shop or branch names, no testimonials, no sales data, no legal receipt template. Future work must not fabricate any of these.

## Product Principles

1. **The rate is always on screen.** Every price is a function of it; staff and customers must be able to see which rate produced which number.
2. **Derive, never retype.** Weight, purity and labor fee are the facts; price, baht-weight and totals are computed. If staff are typing a price, the design has failed.
3. **Counter speed over density.** A sale is taps, not forms. Legible at arm's length with a customer watching.
4. **Same screens in every branch.** Staff rotate; layouts, labels and flows must not vary per shop.
5. **Two languages, one layout.** Thai and English must both fit without one being an afterthought or the other breaking the grid.

## Accessibility & Inclusion

Bilingual Thai / English staff and customers. Thai script needs comfortable line height and a font with proper Thai glyphs; numbers and currency must read unambiguously in both scripts. Touch targets sized for tablet use at a counter. No specific standard (WCAG level) has been mandated.
