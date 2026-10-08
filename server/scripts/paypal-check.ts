// server/scripts/paypal-check.ts — run: PAYPAL_CLIENT_ID=.. PAYPAL_SECRET=.. CURRENCY=THB npx tsx scripts/paypal-check.ts
const base = process.env.PAYPAL_BASE ?? "https://api-m.sandbox.paypal.com";
const currency = process.env.CURRENCY ?? "THB";
const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`).toString("base64");
const tok = await (await fetch(`${base}/v1/oauth2/token`, { method: "POST", headers: { authorization: `Basic ${auth}`, "content-type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials" })).json();
const h = { authorization: `Bearer ${tok.access_token}`, "content-type": "application/json" };
const order = await (await fetch(`${base}/v2/checkout/orders`, { method: "POST", headers: h, body: JSON.stringify({ intent: "CAPTURE", purchase_units: [{ amount: { currency_code: currency, value: "100.00" } }] }) })).json();
console.log("order", order.id, order.status, (order.links ?? []).find((l: { rel: string }) => l.rel === "approve")?.href);
console.log("Open the approve link, log in as the sandbox BUYER, approve, then press Enter.");
await new Promise((r) => process.stdin.once("data", r));
const cap = await (await fetch(`${base}/v2/checkout/orders/${order.id}/capture`, { method: "POST", headers: { ...h, "PayPal-Request-Id": `check-${order.id}` } })).json();
const c = cap.purchase_units?.[0]?.payments?.captures?.[0];
console.log("order status:", cap.status, "capture status:", c?.status, "reason:", c?.status_details?.reason, "amount:", c?.amount);
process.exit(0);
