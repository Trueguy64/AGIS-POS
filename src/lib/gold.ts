import type { Item } from "../types/types";

export const PURITIES = [
  { label: "96.5% ทองไทย · Thai standard", value: 0.965 },
  { label: "99.99% ทองคำแท่ง · Bullion", value: 0.9999 },
  { label: "90%", value: 0.9 },
  { label: "75% (18K)", value: 0.75 },
  { label: "58.5% (14K)", value: 0.585 },
];

/** Thai gold weights: ornament baht = 15.244 g, bar baht = 15.16 g, salueng = ¼ baht. */
export const BAHT_G = 15.244;
export const BAR_BAHT_G = 15.16;
export const SALUENG_G = BAHT_G / 4;
export const THAI_STANDARD = 0.965;

/** "1 บาท", "2 สลึง", or null when the weight is not a Thai unit (e.g. a 10 g bar). */
export function thaiWeight(weight: number): string | null {
  const near = (unitG: number, tolG: number) => {
    const n = Math.round(weight / unitG);
    return n >= 1 && Math.abs(weight - n * unitG) <= tolG ? n : null;
  };
  const baht = near(BAHT_G, 0.1) ?? near(BAR_BAHT_G, 0.05);
  if (baht) return `${baht} บาท`;
  const salueng = near(SALUENG_G, 0.05);
  if (salueng) return `${salueng} สลึง`;
  return null;
}

/** Selling price in whole baht for one piece: pure-gold content at today's rate plus the fixed labor fee. */
export function itemPrice(item: Pick<Item, "weight" | "purity" | "laborFee">, thbPerGram: number): number {
  return Math.round(item.weight * item.purity * thbPerGram + item.laborFee);
}

/** The counter's rate: baht per baht-weight of 96.5% ornament gold (or bar gold), whole baht. */
export const ratePerBaht = (thbPerGram: number, kind: "ornament" | "bar" = "ornament") =>
  Math.round(thbPerGram * (kind === "bar" ? BAR_BAHT_G : BAHT_G) * THAI_STANDARD);

/** Whole-baht money. Satang is never shown on the counter; prices are rounded when computed. */
export const thb = (n: number) => `฿${Math.round(n).toLocaleString("en-US")}`;

/** Per-gram rate keeps two decimals because it is the formula input, not a price. */
export const thbPerGramText = (n: number) =>
  `฿${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** "1 บาท · 15.244 g · 96.5%" or "10 g · 99.99%" */
export const describeGold = (item: Pick<Item, "weight" | "purity">) =>
  `${thaiWeight(item.weight) ? `${thaiWeight(item.weight)} · ` : ""}${item.weight} g · ${+(item.purity * 100).toFixed(2)}%`;

/** The one money column: every amount on screen and on paper right-aligns to this width. */
export const MONEY_COL = "w-32 shrink-0 text-right tabular-nums";

/** A rate older than this is shown as stale on the stamp. */
export const STALE_AFTER_MS = 5 * 60_000;
/** A lock older than this asks the cashier to keep or relock before confirming payment. */
export const LOCK_REVIEW_AFTER_MS = 10 * 60_000;

/** Thai receipt date: day/month/Buddhist year, 24-hour clock. "06/10/2569 19:01" */
export const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat("th-TH-u-ca-buddhist-nu-latn", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date(iso));

export const formatTime = (iso: string) =>
  new Intl.DateTimeFormat("th-TH-u-nu-latn", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));

/** Receipt number from the sale id. */
export const receiptNo = (id: number) => `#${String(id).padStart(6, "0")}`;
