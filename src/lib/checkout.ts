import type { CartItem, Promo, RateLock } from "../types/types";
import { itemPrice } from "./gold";

/** Subtotal, discount and total for a set of lines at a given rate. Mirrors server/src/routes/sale.ts. */
export function computeTotals(lines: CartItem[], promos: Promo[], thbPerGram: number) {
  const subtotal = lines.reduce((s, l) => s + itemPrice(l.item, thbPerGram) * l.quantity, 0);
  const discount = Math.min(
    subtotal,
    Math.round(promos.reduce((s, p) => s + (p.type === "PERCENT" ? subtotal * (p.discountAmount / 100) : p.discountAmount), 0)),
  );
  return { subtotal, discount, total: subtotal - discount };
}

/** Cash amounts a cashier is likely to be handed: exact, then the next round thousands above the total. */
export function quickAmounts(total: number): number[] {
  const up = (step: number) => Math.ceil(total / step) * step;
  return [...new Set([total, up(1_000), up(10_000), up(100_000)])].filter((n) => n >= total).slice(0, 4);
}

// The sale in progress survives a refresh: cart in localStorage (shared with the catalog),
// applied promos and the rate lock in sessionStorage (this tab's sale only).
const read = <T,>(store: Storage, key: string): T | null => {
  try { const raw = store.getItem(key); return raw ? (JSON.parse(raw) as T) : null; } catch { return null; }
};

export const getCart = () => read<CartItem[]>(localStorage, "cart") ?? [];
export const setCart = (cart: CartItem[]) => localStorage.setItem("cart", JSON.stringify(cart));
export const getPromos = () => read<Promo[]>(sessionStorage, "promos") ?? [];
export const setPromos = (promos: Promo[]) => sessionStorage.setItem("promos", JSON.stringify(promos));
// A lock saved before saleKey existed is dropped so the cashier relocks instead of sending a shared bad key.
export const getLock = () => { const lock = read<RateLock>(sessionStorage, "lock"); return lock?.saleKey ? lock : null; };
/** UUID v4 via getRandomValues: crypto.randomUUID is missing on plain-http LAN tablets (`vite --host`). */
export const newSaleKey = () => {
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};
export const setLock = (lock: RateLock) => sessionStorage.setItem("lock", JSON.stringify(lock));

/** After a sale is recorded or cancelled: the next customer starts clean. */
export function clearSale() {
  localStorage.removeItem("cart");
  sessionStorage.removeItem("promos");
  sessionStorage.removeItem("lock");
}
export const clearLock = () => sessionStorage.removeItem("lock");
