export type OrderInfo = { orderStatus: string; captureStatus?: string; capturedMinor?: number; currency?: string };
export type PayPalResult<T> = { kind: "ok"; value: T } | { kind: "refused"; status: number; issue: string } | { kind: "unknown"; error: string };
export interface PayPal {
  createOrder(minor: number, currency: string, requestId: string): Promise<PayPalResult<{ orderId: string }>>;
  getOrder(orderId: string): Promise<PayPalResult<OrderInfo>>;
  captureOrder(orderId: string, requestId: string): Promise<PayPalResult<OrderInfo>>;
}

export function toMinor(value: string): number {
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!m) throw new Error(`Bad money string: ${value}`);
  return Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
}
export const fromMinor = (minor: number) => {
  if (!Number.isSafeInteger(minor) || minor < 0) throw new Error(`Bad minor: ${minor}`);
  return `${Math.trunc(minor / 100)}.${String(minor % 100).padStart(2, "0")}`;
};

type RawOrder = { id?: string; status?: string; purchase_units?: { payments?: { captures?: { status?: string; amount?: { currency_code?: string; value?: string } }[] } }[] };
const orderInfo = (o: RawOrder): OrderInfo => {
  const c = o.purchase_units?.[0]?.payments?.captures?.[0];
  return {
    orderStatus: o.status ?? "UNKNOWN",
    ...(c ? { captureStatus: c.status, capturedMinor: c.amount?.value ? toMinor(c.amount.value) : undefined, currency: c.amount?.currency_code } : {}),
  };
};

export function createPayPal(opts: { clientId: string; secret: string; base?: string; fetch?: typeof fetch; timeoutMs?: number }): PayPal {
  const base = opts.base ?? "https://api-m.sandbox.paypal.com";
  const f = opts.fetch ?? fetch;
  const timeoutMs = opts.timeoutMs ?? 20_000;
  let token: { value: string; until: number } | null = null;

  async function call<T>(method: string, path: string, body: unknown, headers: Record<string, string>, map: (j: unknown) => T): Promise<PayPalResult<T>> {
    let retried = false;
    while (true) {
      try {
        if (!token || Date.now() > token.until) {
          const auth = Buffer.from(`${opts.clientId}:${opts.secret}`).toString("base64");
          const t = await f(`${base}/v1/oauth2/token`, { method: "POST", headers: { authorization: `Basic ${auth}`, "content-type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials", signal: AbortSignal.timeout(timeoutMs) });
          if (!t.ok) return t.status >= 500 ? { kind: "unknown", error: `token ${t.status}` } : { kind: "refused", status: t.status, issue: "AUTH_FAILED" };
          const j = (await t.json()) as { access_token: string; expires_in: number };
          token = { value: j.access_token, until: Date.now() + (j.expires_in - 60) * 1000 };
        }
        const res = await f(`${base}${path}`, {
          method, signal: AbortSignal.timeout(timeoutMs),
          headers: { authorization: `Bearer ${token.value}`, "content-type": "application/json", ...headers },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        if (res.status === 401 && !retried) { token = null; retried = true; continue; }
        const text = await res.text();
        const json = text ? JSON.parse(text) : {};
        if (res.ok) return { kind: "ok", value: map(json) };
        if (res.status >= 500) return { kind: "unknown", error: `HTTP ${res.status}` };
        const issue = json?.details?.[0]?.issue ?? json?.name ?? (res.status === 404 ? "NOT_FOUND" : `HTTP_${res.status}`);
        return { kind: "refused", status: res.status, issue };
      } catch (e) {
        return { kind: "unknown", error: (e as Error).message };
      }
    }
  }

  return {
    createOrder: (minor, currency, requestId) => {
      if (!Number.isSafeInteger(minor) || minor < 0) throw new Error(`Bad minor: ${minor}`);
      return call("POST", "/v2/checkout/orders",
        { intent: "CAPTURE", purchase_units: [{ amount: { currency_code: currency, value: fromMinor(minor) } }] },
        { "PayPal-Request-Id": requestId }, (j) => {
          const id = (j as RawOrder).id;
          if (typeof id !== "string" || !id) throw new Error("PayPal createOrder: missing id");
          return { orderId: id };
        });
    },
    getOrder: (orderId) => call("GET", `/v2/checkout/orders/${orderId}`, undefined, {}, (j) => orderInfo(j as RawOrder)),
    captureOrder: (orderId, requestId) => call("POST", `/v2/checkout/orders/${orderId}/capture`, undefined, { "PayPal-Request-Id": requestId }, (j) => orderInfo(j as RawOrder)),
  };
}
