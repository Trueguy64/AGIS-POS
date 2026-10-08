# Day-1 checks (2026-10-08)

## PayPal sandbox currency
- Thai sandbox merchant (business) account: approval failed with `COMPLIANCE_VIOLATION` (generic error page) for both a Thai and a US sandbox buyer, in THB and USD.
- US sandbox merchant account (app re-created on it):
  - USD 100.00 → order COMPLETED, capture COMPLETED.
  - THB 100.00 → order COMPLETED, capture COMPLETED.
- Decision: `PAYPAL_CURRENCY=THB` with the US sandbox merchant app. A real deployment would use the shop's own PayPal business account, subject to PayPal's availability in Thailand.
- Note: `scripts/paypal-check.ts` creates orders without a return URL, so the approval page spins after "Continue"; the approval is recorded anyway — press Enter in the terminal to capture.

## MiniMax from a hosted server
- Not yet run on Render. Locally the gateway answers tool requests (`tool_use`) in ~1.3 s and the `/api/agent/chat` smoke test returned real catalog pieces.
- To do at the Render checkpoint: deploy and confirm `/api/agent/chat` answers from Render.

## PayPal Agent Toolkit
- Not adopted: the plain Orders v2 `fetch` client is used behind the `PayPal` interface.
