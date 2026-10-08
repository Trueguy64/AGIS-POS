---
name: AGIS Gold POS
description: White weigh-slip panels on gold paper, brass chrome, and one red rubber stamp for the live rate; a flat counter UI for selling gold by weight at today's price.
colors:
  paper: "oklch(96.5% 0.028 88)"
  paper-deep: "oklch(93% 0.045 86)"
  slip: "#ffffff"
  brass-100: "oklch(92% 0.055 88)"
  brass-300: "oklch(82% 0.09 84)"
  brass-500: "oklch(66% 0.13 76)"
  brass-700: "oklch(50% 0.115 70)"
  brass-800: "oklch(40% 0.1 66)"
  ink: "oklch(22% 0.02 70)"
  ink-soft: "oklch(42% 0.02 70)"
  ink-muted: "oklch(52% 0.018 70)"
  stamp: "oklch(50% 0.2 27)"
  stamp-tint: "oklch(96% 0.02 27)"
  ok: "oklch(50% 0.14 150)"
  qr-navy: "#00427a"
typography:
  display:
    fontFamily: "Noto Sans, Noto Sans Thai, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "normal"
  compact:
    fontFamily: "Noto Sans, Noto Sans Thai, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
    fontFeature: "tabular-nums"
  label:
    fontFamily: "Noto Sans, Noto Sans Thai, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.025em"
rounded:
  slip: "0.375rem"
  mark: "0.25rem"
  full: "9999px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
  xl: "1.25rem"
  2xl: "1.5rem"
  3xl: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.brass-700}"
    textColor: "{colors.slip}"
    typography: "{typography.compact}"
    rounded: "{rounded.slip}"
    padding: "0 1.25rem"
    height: "3rem"
  button-primary-hover:
    backgroundColor: "{colors.brass-800}"
  button-primary-display:
    backgroundColor: "{colors.brass-700}"
    textColor: "{colors.slip}"
    typography: "{typography.display}"
    rounded: "{rounded.slip}"
    padding: "0 1.25rem"
    height: "3.5rem"
  button-secondary:
    backgroundColor: "{colors.slip}"
    textColor: "{colors.ink}"
    typography: "{typography.compact}"
    rounded: "{rounded.slip}"
    padding: "0 1rem"
    height: "2.75rem"
  button-secondary-hover:
    backgroundColor: "{colors.paper}"
  button-outline-brass:
    backgroundColor: "{colors.slip}"
    textColor: "{colors.brass-800}"
    typography: "{typography.compact}"
    rounded: "{rounded.slip}"
    padding: "0 1rem"
    height: "2.75rem"
  button-outline-brass-hover:
    backgroundColor: "{colors.brass-100}"
  button-outline-stamp:
    backgroundColor: "{colors.slip}"
    textColor: "{colors.stamp}"
    typography: "{typography.compact}"
    rounded: "{rounded.slip}"
    padding: "0 1rem"
    height: "3rem"
  button-outline-stamp-hover:
    backgroundColor: "{colors.stamp-tint}"
  panel-slip:
    backgroundColor: "{colors.slip}"
    textColor: "{colors.ink}"
    rounded: "{rounded.slip}"
    padding: "{spacing.xl}"
  card-item:
    backgroundColor: "{colors.slip}"
    textColor: "{colors.ink}"
    rounded: "{rounded.slip}"
    padding: "{spacing.md}"
  dialog:
    backgroundColor: "{colors.slip}"
    textColor: "{colors.ink}"
    rounded: "{rounded.slip}"
    padding: "{spacing.2xl}"
  input:
    backgroundColor: "{colors.slip}"
    textColor: "{colors.ink}"
    typography: "{typography.compact}"
    rounded: "{rounded.slip}"
    padding: "0 0.75rem"
    height: "2.75rem"
  input-cash:
    backgroundColor: "{colors.slip}"
    textColor: "{colors.ink}"
    typography: "{typography.display}"
    rounded: "{rounded.slip}"
    padding: "0 0.75rem"
    height: "3.5rem"
  chip-tag:
    backgroundColor: "{colors.brass-100}"
    textColor: "{colors.brass-800}"
    typography: "{typography.compact}"
    rounded: "{rounded.mark}"
    padding: "0.125rem 0.5rem"
  chip-tag-hover:
    backgroundColor: "{colors.brass-300}"
  nav:
    backgroundColor: "{colors.brass-700}"
    textColor: "{colors.slip}"
    height: "4rem"
    padding: "0 1rem"
  sidebar-row:
    backgroundColor: "{colors.slip}"
    textColor: "{colors.ink}"
    typography: "{typography.compact}"
    padding: "0.75rem 1rem"
  sidebar-row-selected:
    backgroundColor: "{colors.brass-100}"
    textColor: "{colors.brass-800}"
  stamp-rate:
    backgroundColor: "{colors.slip}"
    textColor: "{colors.stamp}"
    typography: "{typography.display}"
    rounded: "{rounded.slip}"
    padding: "0 0.75rem"
    height: "3rem"
  stamp-rate-locked:
    backgroundColor: "{colors.slip}"
    textColor: "{colors.stamp}"
    typography: "{typography.display}"
    rounded: "{rounded.slip}"
    padding: "0.5rem 1rem"
  stale-marker:
    backgroundColor: "{colors.stamp}"
    textColor: "{colors.slip}"
    typography: "{typography.label}"
    rounded: "{rounded.mark}"
    padding: "0.125rem 0.375rem"
  error-note:
    backgroundColor: "{colors.stamp-tint}"
    textColor: "{colors.stamp}"
    typography: "{typography.compact}"
    rounded: "{rounded.slip}"
    padding: "0.5rem 0.75rem"
  tab-segment:
    backgroundColor: "{colors.slip}"
    textColor: "{colors.ink}"
    typography: "{typography.compact}"
    rounded: "{rounded.slip}"
    height: "2.75rem"
  tab-segment-hover:
    backgroundColor: "{colors.paper}"
  tab-segment-selected:
    backgroundColor: "{colors.brass-100}"
    textColor: "{colors.brass-800}"
  row-new-dashed:
    backgroundColor: "{colors.slip}"
    textColor: "{colors.brass-800}"
    typography: "{typography.compact}"
    rounded: "{rounded.slip}"
    padding: "0 0.75rem"
    height: "2.75rem"
  row-new-dashed-hover:
    backgroundColor: "{colors.brass-100}"
  rail-form:
    backgroundColor: "{colors.brass-100}"
    textColor: "{colors.brass-800}"
    typography: "{typography.compact}"
    rounded: "{rounded.slip}"
    padding: "{spacing.md}"
  photo-picker:
    backgroundColor: "{colors.slip}"
    textColor: "{colors.ink}"
    typography: "{typography.compact}"
    rounded: "{rounded.slip}"
    padding: "{spacing.md}"
  photo-picker-well:
    backgroundColor: "{colors.paper-deep}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.slip}"
    size: "6rem"
  dialog-confirm:
    backgroundColor: "{colors.slip}"
    textColor: "{colors.ink}"
    rounded: "{rounded.slip}"
    padding: "{spacing.2xl}"
    width: "24rem"
---

# Design System: AGIS Gold POS

## Overview

**Creative North Star: "The Gold Slip"**

Every screen is the carbon-copy weigh slip a Thai gold shop already hands across the counter. White slip panels sit on a pale gold-paper ground, the chrome (top bar, buttons, selected rows) is matte brass, and the one thing allowed to be loud is the live gold rate, struck onto the page as a red rubber stamp. Money lives in a single right-aligned tabular column; every price on screen visibly descends from the stamped rate. The world refuses both the category's white-cards-plus-one-accent shell and the dark luxury-boutique opposite: it is a working document, legible at arm's length under shop light, not a brand moment.

The system is flat by doctrine and quiet by construction. There are no shadows, no gradients and no ruled lines between rows; the only rules in the interface sit under a table header and above a total, and the dashed line above a receipt footer is a perforation in the paper, not a shelf. Type comes in exactly three sizes (compact, money and display) and ranks everything else by weight; the only tracked label in the system is the stamp's own. The face is Noto Sans with Noto Sans Thai, self-hosted at 400/600/700 with tabular figures. Every string is Thai first with English beside it (`src/lib/i18n.ts` through `Bi`, `th()` and `both()`); the Thai copy was written by the build and awaits a native speaker's review.

Every screen is built in this world: the cashier flow (catalog, bag and receipt, payment type, PromptPay/cash dialog, thank-you and printed slip), the manager editor (`src/pages/editorMenu.tsx`, `src/components/editorSide/*`), the auth pages (`LoginPage`, `RegisterPage`, `src/components/Authentication/*`) and `storeProfile`; the editor is the back of the same counter, with the same brass bar, slip rows and live price per piece. "AGIS" is a typographic wordmark standing in for a logo that does not exist yet; the ASIS SVG in `src/assets` is an upstream placeholder and is not part of the system.

**Key Characteristics:**
- Gold-paper ground, white slip panels with a 1px brass-tinted edge and 6px corners
- Brass chrome: a 64px brass-700 top bar, brass-700 action buttons, brass-100 selected rows and tags
- One red rubber stamp for the live rate (3px double border, rolling digits, strikes the receipt at -2°)
- Three type sizes (compact, money, display); rank by weight (400 / 600 / 700) inside them, never by a fourth size
- One money column (8rem, right-aligned, tabular, whole baht) on screen and on paper; prices in brass-800
- Thai leads every label at full weight; English follows in 400 muted, inline or stacked beneath
- No shadows, no gradients, no row rules; rules only under table headers and above totals
- Lucide outline icons, 16–26px inline, 48px pictograms for payment types

## Colors

A warm, low-chroma gold-paper field with white slips and a five-step brass ramp, where the only saturated hue is the stamp red.

### Primary
- **Brass 700** (`{colors.brass-700}`): the chrome. The 64px top bar, every primary action ("Add to bag", "Lock rate and continue", "Confirm payment", "Print receipt", the Checkout bar, "Store editor"), the "All pieces" badge, and the 48px payment pictograms. Hover deepens one step to brass-800.
- **Brass 800** (`{colors.brass-800}`): the price colour and the hover state of brass-700. Every computed price on an item card, the buy dialog, and every receipt Total is bold brass-800. Also the text on brass-100 tags and selected sidebar rows, and the "Apply" promo button's text and stroke.
- **Brass 300** (`{colors.brass-300}`): the slip edge. The 1px border on every panel, card, dialog, input, secondary button and the search pill; the sidebar's right rule; the scrollbar thumb; text selection. Hover fill on brass-100 tags.
- **Brass 100** (`{colors.brass-100}`): the brass tint. Selected sidebar row, category tag chips in the search pill, the search submit block, emoji category badges, "Apply" hover, and the "Gold" word beside the AGIS wordmark on the bar.
- **Brass 500** (`{colors.brass-500}`): the dashed stroke only. The receipt perforation and the dashed edge of an applied promo card.

### Tertiary
- **Stamp Red** (`{colors.stamp}`): the rubber stamp and errors. The rate stamp's 3px double border and text, the Stale marker fill, the Promo discount line on a receipt, "Sold out", the Remove-promo link, the cancel-payment outline button, and error text. Never a decoration.
- **Stamp Tint** (`{colors.stamp-tint}`): the wash behind error notes and the hover fill of red outline buttons and the trash button.
- **Change Green** (`{colors.ok}`): success and change only: the Change line in the cash dialog and on the thank-you slip.
- **Thai QR Navy** (`{colors.qr-navy}`): the PromptPay dialog's header band behind the Thai QR Payment logo. A payment-scheme brand colour, used nowhere else.

### Neutral
- **Gold Paper** (`{colors.paper}`): the page ground on every screen and the hover wash on white rows and secondary buttons.
- **Deep Paper** (`{colors.paper-deep}`): the photo well behind product images (card and buy dialog) and the "Uncategorized" badge.
- **Slip White** (`{colors.slip}`): every panel, card, dialog, input and the stamp's own ground; the text colour on brass-700.
- **Ink** (`{colors.ink}`): titles, totals, body text, the 50% scrim behind dialogs and the 30% scrim behind the phone sidebar; the printed slip's header and total rules.
- **Ink Soft** (`{colors.ink-soft}`): the second line: weight · purity, "each" prices, `<dt>` labels, helper copy.
- **Ink Muted** (`{colors.ink-muted}`): placeholders, piece counts, stock counts, "Rate locked for this sale", dropdown captions.

### Named Rules
**The Brass Carries Rule.** Brass carries the shell and the actions; red belongs to the stamp and to errors; green belongs to success and change. Nothing else on screen is coloured for emphasis. Attention is earned by weight or by the display size, not by a new hue.

**The Price Deep, Action Mid Rule.** Prices are bold brass-800 text; actions are white text on brass-700 fill. The two never swap, so a customer can tell a number from a tap target at a glance.

**The One Scheme Colour Rule.** Thai QR Navy appears only in the PromptPay dialog header, behind the scheme's own logo. Any other navy is a mistake.

## Typography

**Display Font:** Noto Sans (with Noto Sans Thai, then ui-sans-serif, system-ui)
**Body Font:** The same stack; one family, three weights (400, 600, 700), self-hosted via @fontsource
**Label/Mono Font:** None. Figures are tabular (`font-variant-numeric: tabular-nums` on `body`), so money never needs a monospace face.

**Character:** A Thai-native workhorse sans at three sizes, set with tabular figures so every column of money lines up. Nothing is shouted; hierarchy is weight and placement. Line-height 1.6 on compact text leaves room for Thai ascenders and descenders; Thai and English share one line box everywhere.

### Hierarchy
- **Display** (700, 1.75rem, line-height 1.15): the Thai line of panel titles ("รายการขาย", "ใบเสร็จ", "ลูกค้าชำระด้วยวิธีใด", "ชำระเงินเรียบร้อย ขอบคุณ"), the AGIS wordmark (tracking -0.025em), the price in the buy dialog, every Total, the rate figure in the stamp, the cash-given input and the payment-type names. Empty states use it too.
- **Money** (`--text-money`, 1.25rem, line-height 1.3): amounts a cashier reads at arm's length that are not the Total: card prices, bag line totals, the quantity count, Total due and Change in the cash dialog, Paid and Change on the thank-you slip, and the Thai line of the 3.5rem checkout-path buttons. Always 700, always tabular, never for labels.
- **Compact** (400, 0.9375rem, line-height 1.6): everything else. Body text, labels, row text, chips, nav text, the "/บาท" unit suffix (600), the English line under a stacked title, and the time on the stamp. Rank inside compact by weight: 400 for description and English companions, 600 for names and secondary emphasis, 700 for amounts and button text.
- **Label** (700, 0.9375rem, 0.025em tracking): the stamp's own word only: "ทองรูปพรรณ" on the live stamp and "ล็อกราคาแล้ว Rate locked" on the struck stamp. This is the single tracked device in the system.

### Named Rules
**The Three Sizes Rule.** `--text-compact` (0.9375rem), `--text-money` (1.25rem) and `--text-display` (1.75rem) are the only font sizes. Money is for amounts only. A new element picks one and ranks by weight; it does not introduce 0.75rem, 1.125rem or any clamp.

**The Thai-First Label Rule.** Every user-facing string comes from `S` in `src/lib/i18n.ts`. On screen, Thai leads at the element's weight and English follows in 400 (inline, muted, after a 0.375rem gap, or stacked beneath at compact size via `Bi stack`); `aria-label`s carry both through `both()`. A tight spot may show Thai only (`thOnly`) when English is in the accessible name. No string is typed inline in a component.

**The One Money Column Rule.** Every amount on a receipt-like surface sits in `MONEY_COL` (`src/lib/gold.ts`): 8rem wide, right-aligned, tabular. Prices on cards and in dialogs are right-aligned and tabular even where the column is implicit. Money is always `thb()`: `฿` + grouped thousands in whole baht (prices are rounded to the baht by `itemPrice`); the only decimals on screen are the per-gram formula input (`thbPerGramText`). Gold is always `describeGold()`, Thai weight first: `1 บาท · 15.244 g · 96.5%`, `2 สลึง · 7.62 g · 96.5%`. The rate on every stamp is ornament gold per baht-weight (`ratePerBaht`, 15.244 g × 0.965), the number a Thai counter quotes; per gram is a detail.

**The Stamp Owns Tracking Rule.** Tracking and uppercase are not hierarchy devices. The only tracked label in the system is the stamp's (and the promo-code field, where the data itself is uppercase).

## Layout

The page is a full-height gold-paper field. The catalog is the one chrome-bearing screen: a 64px brass-700 top bar (hamburger in a 44px square, AGIS wordmark at display size with "Gold" in brass-100, a white search pill filling the middle at 44px, the rate stamp at 48px on the right), a 256px white category rail with a 1px brass-300 right edge that collapses to 0 width (and overlays the grid behind a 30% ink scrim on phones), and the card field. Cards repack in whole cells: `repeat(auto-fill, minmax(10.5rem, 1fr))` with a 0.75rem gap on phones, `minmax(13rem, 1fr)` with a 1rem gap from 768px, inside 0.75rem / 1rem padding. Under the field, in its own row above a 1px brass-300 rule, sits the Checkout bar: a 56px brass-700 button, full width on phones and right-aligned from 768px, so it never covers a price and is always in thumb reach.

Checkout screens are two slips side by side from 768px (bag or payment-type panel at two flex shares, receipt at one), stacked on phones, with a 1rem gap growing to 1.25rem at 1024px and page padding of 1rem → 1.5rem → 2rem. The bag page locks to the viewport height at 1024px and scrolls inside its panels; the receipt panel keeps its Total at the bottom edge with `margin-top: auto`. The thank-you slip and the printed receipt are a single 42rem column centred on the field. Dialogs centre on a 50% ink scrim at 28rem (payment) or 48rem (buy dialog, two columns from 768px with the photo well on the left) from 640px; below that every dialog is a bottom sheet: full width, rounded top corners only, safe-area bottom padding, capped at 92vh and scrolling inside (`src/components/Dialog.tsx`). On phones the receipt's footer is sticky to the viewport bottom while the receipt is on screen, so Lock is never below the fold.

Row rhythm inside slips: panel padding 1.25rem (1.5rem on dialogs and the thank-you slip, 2rem on the printed slip), row padding 0.75rem vertical / 1rem–1.25rem horizontal, 0.5rem between receipt lines, 0.75rem between cards. Tap targets are 40px (steppers) to 44px (icon buttons, inputs, secondary buttons), 48px (primary buttons, the rate stamp) and 56px (checkout-path buttons). Breakpoints are Tailwind's 640 / 768 / 1024px.

### Named Rules
**The Whole Cell Rule.** The catalog grid uses `auto-fill` with a fixed minimum so a card is never cropped or orphaned at any width; the grid grows by whole cells.

## Elevation & Depth

Flat by doctrine. No surface in the cashier flow carries a `box-shadow`, and there are no gradients. Depth is paper: the gold-paper ground, a white slip with a 1px brass-300 edge on it, and a brass-100 tint inside the slip for a selected row or a tag. Hover never lifts; it darkens a fill one step (brass-700 → brass-800, brass-100 → brass-300) or swaps a 1px brass-300 edge for brass-700. Dialogs sit on a 50% ink scrim with the same 1px edge as any panel. The dashed brass-500 line above a receipt footer is a perforation in the slip, not a shadow or a divider.

### Named Rules
**The Paper Not Depth Rule.** A surface is distinguished by its ground (paper, slip, tint) and its 1px edge, never by a drop shadow or a gradient. If an element seems to need lifting, give it a brass edge instead.

**The Two Rules Rule.** Ruled lines appear in exactly two places: under a table header and above a total (1px brass-300 on screen, 1px ink on the printed slip). Rows are separated by spacing, never by lines.

## Shapes

One radius. Every slip, card, dialog, input, button, stamp and photo thumbnail uses the slip corner (`--radius-slip`, 0.375rem); the receipt splits it across its body (top corners) and footer (bottom corners) so the perforation runs through a single silhouette. Two small exceptions exist: 0.25rem on marks that sit inside a line of text (the brass-100 tag chips in the search pill and the red Stale marker), and full circles for the 32px category badges in the rail. Strokes are 1px brass-300 everywhere, 3px double stamp-red on the rate stamp (3px dashed at 50% while the rate loads), and 1px dashed brass-500 for the perforation and applied promo cards. Photo wells are square (`aspect-square`) with the image covering; bag thumbnails are 48px rounded squares. The struck stamp rotates -2° and the live one stays level. Icons are Lucide outlines at 14–26px inline and 48px with a 1.5 stroke for the two payment pictograms.

## Components

### Buttons
Standard controls, brass by default, nothing lifted.
- **Shape:** slip corner (0.375rem); 48px tall on the primary path, 56px for the checkout-path trio (Lock rate and continue, Confirm payment, Print receipt), 44px for icon squares and secondary buttons.
- **Primary (brass-700):** white 700-weight text on brass-700 fill, 1.25rem horizontal padding; the 56px variants stack the Thai line at money size over the English line at compact 400. Hover and active go brass-800. Disabled drops to 50% opacity with a not-allowed cursor (Lock while the rate loads, Add to bag when sold out, Confirm while the sale is being recorded, with `aria-busy`).
- **Secondary:** white with a 1px brass-300 stroke and 600–700 ink text ("Settings", "New sale", the back arrow square); hover washes gold-paper.
- **Brass outline:** 1px brass-700 stroke with brass-800 600-weight text ("Apply" promo); hover fills brass-100.
- **Red outline:** 1px stamp stroke with stamp text ("Cancel and go back to the bag", "Delete" in the confirmation dialog and the rail form, "Sign out" on the account slip); hover fills stamp-tint. A destructive action is always this outline, never a red fill, and it stands beside a secondary button ("Keep it", "Reset"). Text-only red links ("Remove") underline on hover.
- **Icon squares:** 44px (40px for steppers), no stroke, hover washes paper; destructive icons (trash, close) turn stamp on hover, the trash square washes stamp-tint. The rail form's check / X squares are 44px: a brass-700 primary square (disabled at 50%) and a white secondary square with the brass-300 edge.
- **Bar button:** on the brass bar, a 44px white block with brass-800 700 text and no stroke ("New piece" with a 20px plus); hover fills brass-100. The label hides below 768px and the plus stays.
- **Checkout bar:** a 56px brass-700 button reading "ชำระเงิน · n Checkout" with a 22px arrow, in its own row under the card field (full width on phones, right-aligned from 768px).

### Chips
- **Tag chip (search pill):** brass-100 fill, brass-800 600-weight text, 0.25rem corner, 0.125rem × 0.5rem padding, a 14px X that turns stamp on hover; the chip itself washes brass-300. Backspace at the caret start removes the last chip.
- **Stale marker:** stamp fill, white 700 text, 0.25rem corner, reads "Stale · 14:02" at 768px and up, "Stale" below.
- **Category badge:** 32px circle, brass-100 behind the category emoji; brass-700 behind the "All pieces" grid icon; deep paper behind the "Uncategorized" box icon.
- **Segmented tabs (editor rail):** a `role="tablist"` of equal 44px `<button role="tab">` segments with 600 text and the slip corner, 0.25rem apart inside 0.5rem padding, no stroke and no track. The selected tab is brass-100 with brass-800 text (the same tint as a selected rail row); the others are ink and wash paper on hover.

### Cards / Containers
- **Slip panel:** white, slip corner, 1px brass-300 edge, 1.25rem padding, scrolls inside. Panel header is a display title with its meta (piece count, stamp) pushed to the right edge.
- **Item card:** a `<button>`; white, slip corner, 1px brass-300 edge, square deep-paper photo well with a 1px brass-300 bottom edge, 0.75rem body: 600 title clamped to two lines, soft `weight · purity · category` line, then stock (muted, or "Sold out" in bold stamp) left and the bold brass-800 price right. Hover and focus swap the edge to brass-700; sold-out photos drop to 50% opacity and greyscale.
- **Receipt slip (signature):** body and footer are one silhouette split by a dashed brass-500 perforation. Header: the stacked "ใบเสร็จ / Receipt" title and the stamp (live and compact while building; struck once locked), wrapping under the title on phones. Lines: 600 name, "× n" in soft ink, amount in the money column, no rules between rows. The promo field and applied codes sit under the lines, above the Subtotal block, and vanish once the rate is locked. A 1px brass-300 rule precedes Subtotal. Discount reads in stamp red with a leading minus and the codes after a middle dot. Total is display-size: "ยอดสุทธิ / Total" in ink, the amount in brass-800. Footer holds the 56px Lock button, whose Thai line carries the per-baht rate being locked ("ล็อกราคาแล้วชำระเงิน ฿66,092/บาท"), or the muted sentence "Rate locked for this sale". On phones the footer is sticky to the viewport bottom while a Lock button is in it.
- **Dialog:** white, slip corner, 1px brass-300 edge, 28rem (payment) or 48rem (buy), on a 50% ink scrim; a 44px close square top-right. Below 640px it is a bottom sheet (full width, top corners only, safe-area padding). Every dialog is `src/components/Dialog.tsx`: `role="dialog"` or `alertdialog`, focus moved in on open and returned on close, Tab trapped, Escape and scrim click close. The PromptPay dialog opens with a Thai QR Navy band carrying the scheme logo and a white close icon. The editor's piece dialogs are the same slip at 42rem, capped at 90vh, with a display title and the close square in a 1.5rem header and no rule beneath it; the form scrolls inside at 1.5rem padding with 1.25rem between fields and a 48px "Save piece" at the foot.
- **Confirmation dialog:** a 24rem `role="alertdialog"` slip, 1.5rem padding: display title ("Delete this piece?"), a soft-ink sentence naming the piece in 600 ink, then two equal 48px buttons: secondary "Keep it" (autofocused) on the left and the red outline "Delete" on the right. Never a red fill.
- **Editor piece row:** an `<li>` slip with a 1px brass-300 edge and 0.75rem padding: a 56px rounded photo with its own brass-300 edge, then 600 title (two lines, one from 768px), soft `weight · purity · labor · category` line, stock in muted ink (or "Sold out" in bold stamp); on the right the bold brass-800 price over a 44px trash square and a 44px secondary "Edit". Rows sit one per line, two per line from 1024px, 0.75rem apart.
- **Account slip:** auth and account screens are one slip centred on the paper field (28rem for sign-in, register and the access-denied notice; 36rem for the account page), 1.5rem padding (2rem from 768px), opening with the wordmark, then a display title and a soft-ink sentence, fields 1rem apart, and a full-width 48px brass-700 primary. The account page's "Sign out" is a red outline button set 2.5rem below the form.

### Inputs / Fields
- **Text input:** white, 1px brass-300 stroke, slip corner, 44px tall, 0.75rem horizontal padding, compact 600 text; focus swaps the stroke to brass-700 and removes the outline (the page-level `:focus-visible` ring is 2px brass-700 offset 2px). Placeholder in muted ink; caret in brass-700.
- **Cash input:** the same at 56px tall with display-size bold tabular text, a muted ฿ prefix, a "0" placeholder, digits grouped as typed (`inputMode="numeric"`, no spinner), and a row of 44px quick-amount chips beneath: the exact total (marked "พอดี") then the next round ฿1,000 / ฿10,000 / ฿100,000. Change shows in ok green; a shortfall shows as "ขาดอีก / Short" in stamp red.
- **Quantity stepper:** a 1px brass-300 group with two 40px icon squares around a 2rem 600 count; disabled squares drop to 40%.
- **Search pill:** a 44px white form with a 1px brass-300 edge (brass-700 on focus-within): tag chips on the left, a borderless input, and a brass-100 submit block with a brass-800 search icon on the right. The suggestion list is a white slip under it with a muted caption row and brass-100 hover rows.
- **Error:** a stamp-tint note with stamp text, slip corner, `role="alert"`, placed under the field or at the foot of the dialog.
- **Labelled field:** a `<label>` block with a 600 soft-ink label (and an optional 400 muted hint after a middle dot) 0.25rem above the 44px input or native `<select>`; numeric fields take `tabular-nums` and a `decimal` or `numeric` input mode. The error note sits 0.25rem beneath.
- **Rail form:** the inline add/edit slip inside the editor rail: a brass-100 ground with the slip corner and 0.75rem padding, a 600 brass-800 title, one row of 44px white inputs (the category symbol takes a 44px square that accepts one grapheme), then a row with the red outline "Delete" on the left (edit only) and the X and check squares on the right.
- **Photo picker:** a `<label>` slip with the 1px brass-300 edge and 0.75rem padding wrapping a visually hidden file input: a 96px deep-paper well on the left (the image covering, or a 28px image-plus icon in muted ink), then "Choose a photo" / "Change photo" in 600 ink over the accepted formats in soft ink. Hover swaps the edge to brass-700, as a card does.

### Navigation
- **Top bar:** 64px brass-700, white text, 0.75rem / 1rem horizontal padding, 0.75rem / 1rem gaps. Hamburger 44px square (hover brass-800), AGIS wordmark at display 700 with "Gold" in brass-100 600 (hidden below 640px), the search pill filling the middle, the live rate stamp on the right.
- **Category rail:** 256px white, 1px brass-300 right edge. Rows are 48px (0.75rem × 1rem padding) with a 32px badge and the name; selected rows are brass-100 with brass-800 600 text; others wash paper on hover. The footer, above a 1px brass-300 rule, holds the cashier's own account row (person icon, name, opens Settings) and, for Managers only, a secondary "จัดการร้าน Store editor"; selling is never quieter than editing. Rows carry `aria-pressed`; the collapsed rail is `inert`.
- **Phone:** the rail overlays the grid behind a 30% ink scrim; the wordmark hides; the stamp stacks its label over the figure and drops the time; the hamburger carries `aria-expanded`.
- **Editor shell:** the same 64px brass-700 bar with the wordmark reading "AGIS Editor", the search pill, the white "New piece" bar button and the rate stamp (shown from 1024px). The rail is 288px white with the same brass-300 right edge: the segmented Categories / Promotions tabs at the top, a dashed "New …" row, then rows at 0.625rem vertical padding (selected rows brass-100 with 600 brass-800 text, each with a 44px pencil square), and a footer above a 1px brass-300 rule holding a secondary "Back to the counter". Under the list sits a white pagination strip with a brass-300 top rule: a native 44px rows-per-page `<select>` and a 1px brass-300 group of four 44px chevron squares (disabled at 40%).
- **Dashed "New …" row:** a 44px full-width `<button>` with a 1px dashed brass-500 edge, slip corner, 600 brass-800 text and a trailing 18px plus; hover fills brass-100. The dashed stroke marks an empty line to be written on, the same way it marks the receipt perforation and an applied promo.
- **Wordmark:** "AGIS" at display 700 with -0.025em tracking and a 600 word 0.5rem to its right, baseline-aligned. On the brass bar it is white with the word in brass-100 ("Gold" on the counter, "Editor" in the editor); on a slip it is ink with the word in brass-800. It is the one shared mark across the catalog bar, the editor bar and every account slip.

### Rate Stamp (signature)
The live rate as a red rubber stamp. A 48px white block with a 3px double stamp-red border, slip corner, stamp-red text: the label "ทองรูปพรรณ" (compact 700, 0.025em), the figure (ornament gold per baht-weight, `thb(ratePerBaht())` at display size, 700, with a 600-weight "/บาท" at compact size) and the update time (768px and up). Each character that changed since the last render rolls in (`roll-in`, 220ms, translateY(-0.55em), `cubic-bezier(0.2, 0.8, 0.2, 1)`), so a refresh moves only the digits that moved. A rate older than five minutes shows a stamp-filled "เก่า" marker. The stamp is a native `<details>`: tapping it opens a white slip beneath listing ornament per baht, bar per baht (15.16 g), per gram pure gold, XAU/USD, USD/THB and the update time. While loading, the border is 3px dashed at 50% and reads "กำลังโหลดราคาทอง…"; when the feed is down and no rate was ever received, the dashed block reads "ไม่มีราคาทอง" with a stamp-filled "ลองใหม่ Retry" button.

**Locked stamp.** The same block in column form: "ล็อกราคาแล้ว Rate locked", the per-baht figure, then the per-gram rate and the locked date-time in Buddhist-era Thai format (`formatDateTime()`: `06/10/2569 22:12`). It is rotated -2°; when it first appears on the receipt or thank-you slip it strikes (`stamp-strike`, 320ms, scale 1.4 → 0.97 → 1 with rotation -5° → -2°). Both motions are removed under `prefers-reduced-motion`. The printed slip carries the same stamp, unanimated.

### Printed Slip
Black-on-white, no edge: AGIS wordmark with "ใบเสร็จ Receipt #000123" beneath (the receipt number is the sale id, zero-padded) and the locked stamp on the right over a 1px ink rule; a cashier / payment / printed block; a five-column table with bilingual two-line headers (#, รายการ Item with `Thai weight · grams · purity · ค่ากำเหน็จ` beneath, ราคาต่อชิ้น Unit, จำนวน Qty, จำนวนเงิน Amount), a 1px ink rule under the header and above Subtotal, no row rules, amounts right-aligned and tabular; the Total at display size; Paid and Change; and the pricing formula in Thai then English. It renders from the recorded sale, never from the cart. Triggered by `window.print()`; `@media print` whitens the body and hides the on-screen slip.

## Do's and Don'ts

### Do:
- **Do** set every panel, card, dialog and input as a white slip with a 1px brass-300 edge and the 0.375rem slip corner on gold paper.
- **Do** use only the three sizes, 0.9375rem compact, 1.25rem money and 1.75rem display, and rank by weight (400 / 600 / 700) inside them.
- **Do** put every amount in the one money column (8rem, right-aligned, tabular, whole baht) and format it with `thb()`; describe gold with `describeGold()`, Thai weight first; quote the rate per baht-weight.
- **Do** take every string from `src/lib/i18n.ts`, Thai first, English in 400 beside or beneath it.
- **Do** colour prices bold brass-800 and actions white-on-brass-700, hover brass-800.
- **Do** show the live rate stamp on every selling screen, strike it onto the receipt when the rate locks, and print the same stamp.
- **Do** keep the ground flat: rules only under a table header and above a total, the dashed brass-500 perforation above a receipt footer, nothing else ruled.
- **Do** use standard controls (`<button>`, `<input>`, native number and text inputs) at 40px minimum, 44px for icon squares and inputs, 48–56px on the selling path.
- **Do** keep line-height 1.6 on compact text and Noto Sans Thai in the stack; label widths must survive Thai strings.

### Don't:
- **Don't** add a `box-shadow`, a gradient, a blur or a lift on hover anywhere; a surface that needs distinction gets a ground change or a brass edge.
- **Don't** add a fourth font size, a clamp, or a system display face; the wordmark is the same Noto Sans at display size. Money size is for amounts, never for labels or titles.
- **Don't** use uppercase, letter-spacing or a kicker as hierarchy; the stamp label is the only tracked word.
- **Don't** label a value twice; if the receipt shows the total, the panel beside it does not repeat it on counter widths.
- **Don't** use stamp red for anything but the rate stamp and errors, green for anything but success and change, or Thai QR Navy outside the PromptPay header.
- **Don't** draw lines between rows in a list, receipt or table.
- **Don't** replace the Lucide outline set with glyph or emoji icons; the category emoji are shop data, not iconography.
- **Don't** invent a logo mark or shop name; the typographic AGIS wordmark stands until a mark exists. Thai copy lives only in `src/lib/i18n.ts`, where a native speaker can review it in one place.
- **Don't** fill a destructive button red; Delete and Sign out are the red outline (1px stamp stroke, stamp-tint hover) beside a secondary alternative, and a deletion asks first in a `role="alertdialog"` slip.
