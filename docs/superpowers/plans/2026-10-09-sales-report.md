# Sales report — plan

Spec: user request 2026-10-09 — "add a sales report feature, allow ONLY the manager to generate a PDF sales report, while staff can view sales but not generate one". No separate spec doc.

Global constraints: enforcement is server-side (`authorize("Manager")`), the UI only hides the button. Money stays integer THB as stored on `Sale`. Range = `[from, to)` ISO instants; the client turns local dates into instants.

## Task 1: Sales list API (any signed-in staff)
- `GET /api/sale?from=ISO&to=ISO` (authenticate) → `{ from, to, sales: SaleRow[], summary }`.
  `SaleRow = { id, createdAt, cashierName, payment, pieces, subtotal, discount, depositPaid, total }`, newest first.
  `summary = { count, pieces, subtotal, discount, depositPaid, total, cash, promptPay }` (cash/promptPay = sum of `total` by payment).
- 400 on missing/invalid dates or `from >= to`. Route registered before `/:id`.
- Test `server/test/sales-report.test.ts`: Employee gets 200 with 2 of 3 seeded sales (one outside range), correct summary; bad range → 400; no cookie → 401.

## Task 2: PDF report API (Manager only)
- `GET /api/sale/report.pdf?from&to` (authenticate, authorize("Manager")) → `application/pdf`, `Content-Disposition: attachment; filename="sales-<from>-<to>.pdf"`, built with pdfkit from the same query as Task 1.
- Thai text: Noto Sans Thai (thai + latin subsets) copied into `server/assets/fonts`, font chosen per string.
- Tests: Employee → 403; Manager → 200, content-type pdf, body starts `%PDF`.

## Task 3: Sales page
- `/sales` (ProtectedRoute, any role): date range (default today), summary tiles, sales table, each row links to `/payment/thankyou/:id`. Manager sees a "Download PDF" link to the Task 2 URL; staff don't.
- NavBar link next to Reservations. i18n keys added.
- Verify: `npx tsc -b`, `npm run lint`, browser check as Manager and Employee.
