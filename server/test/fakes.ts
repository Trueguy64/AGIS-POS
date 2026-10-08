// server/test/fakes.ts
import type { PayPal, PayPalResult, OrderInfo } from "../src/paypal/client";
import type { Config } from "../src/reservations/service";

export const config: Config = { depositPercent: 10, quoteMinutes: 15, pendingMinutes: 30, holdMinutes: 2880, captureStaleSeconds: 60, currency: "THB", maxPendingPerIp: 2 };
export const rate = async () => ({ thbPerGram: 3000, usdToThb: 36 });

/** Scriptable PayPal. Each method pops the next scripted result; defaults succeed. Records calls. */
export function fakePayPal() {
  const calls: { op: string; args: unknown[] }[] = [];
  const queue: Record<string, (() => Promise<PayPalResult<unknown>>)[]> = { createOrder: [], getOrder: [], captureOrder: [] };
  let n = 0;
  const paid = (minor: number, currency = "THB"): OrderInfo => ({ orderStatus: "COMPLETED", captureStatus: "COMPLETED", capturedMinor: minor, currency });
  const next = <T,>(op: string, dflt: () => PayPalResult<T>, args: unknown[]) => { calls.push({ op, args }); const q = queue[op].shift(); return (q ? q() : Promise.resolve(dflt())) as Promise<PayPalResult<T>>; };
  const pp: PayPal & { calls: typeof calls; script(op: keyof PayPal, ...rs: (() => Promise<PayPalResult<unknown>>)[]): void; lastMinor: number } = {
    calls, lastMinor: 0,
    script(op, ...rs) { queue[op].push(...rs); },
    createOrder(minor, currency, requestId) { pp.lastMinor = minor; return next("createOrder", () => ({ kind: "ok", value: { orderId: `O${++n}` } }), [minor, currency, requestId]); },
    getOrder(orderId) { return next("getOrder", () => ({ kind: "ok", value: paid(pp.lastMinor) }), [orderId]); },
    captureOrder(orderId, requestId) { return next("captureOrder", () => ({ kind: "ok", value: paid(pp.lastMinor) }), [orderId, requestId]); },
  };
  return { pp, paid };
}
