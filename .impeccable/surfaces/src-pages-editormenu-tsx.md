---
version: 1
slug: "src-pages-editormenu-tsx"
primary_target: "src/pages/editorMenu.tsx"
related_targets: ["src/pages/LoginPage.tsx","src/pages/RegisterPage.tsx","src/pages/storeProfile.tsx","src/components/Authentication/ProtectedRoute.tsx"]
---

# Surface brief: manager editor, account, and auth screens

Primary target: `src/pages/editorMenu.tsx`. Related: `src/pages/LoginPage.tsx`, `src/pages/RegisterPage.tsx`, `src/pages/storeProfile.tsx`, `src/components/Authentication/ProtectedRoute.tsx`, `src/components/editorSide/*`.

## Scope and mode

Operate. An extension inside the established Gold Slip world (DESIGN.md is the visual authority; no new world, no direction round). These screens migrate from the inherited blue system to the documented tokens and components. Behaviour, routes and API calls are unchanged.

## Audience, job, proof

A manager maintaining the catalog between sales: adding and editing pieces (weight, purity, labor fee, stock, photo), categories and promo codes, then returning to the counter. Staff signing in, registering, or editing their own account; an employee who lands on the editor by mistake. Proof: the same brass bar, slip rows and live price per piece the catalog shows, so the editor reads as the back of the same counter.

## Direction (inherited)

World: The Gold Slip, as recorded in DESIGN.md. Editor shell: 64px brass bar (wordmark "AGIS Editor", search pill, white "New piece" button, rate stamp from 1024px), a 288px white rail with a two-tab switch (Categories / Promotions), dashed brass "New …" rows, brass-tinted inline add/edit slips, and a "Back to the counter" secondary button; a one- or two-column list of slip rows (photo, name, gold line, stock, brass price, Edit, trash); a slip pagination bar. Dialogs are slips on the ink scrim with a display title and a close square. Auth and account pages are a single 28rem slip on gold paper opening with the wordmark. Destructive confirmation uses the red outline button, never a red fill.

## Memorable moment

Opening the editor and seeing every piece priced at the same stamped rate the counter shows.

## Unresolved

Bilingual strings. Real product photos. Whether the editor should show the live stamp below 1024px.
