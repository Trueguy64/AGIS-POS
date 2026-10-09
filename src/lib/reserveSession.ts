import type { ChatResponse, QuoteCard, ReservationStatus } from "../api/reservation.ts";

/** What the customer would lose on a refresh. Kept in localStorage so closing the tab and coming back to pay works too. */
export type ReserveSession = {
  messages: { role: "user" | "assistant"; content: string }[];
  quote: QuoteCard | null;
  reservation: ChatResponse["reservation"] | null;
  status: ReservationStatus | null;
};
type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const KEY = "agis-reserve";
const MAX_AGE = 48 * 3600_000; // the deposit hold; nothing in an older chat can still be acted on

export function saveSession(store: Store, s: ReserveSession, now = Date.now()) {
  try { store.setItem(KEY, JSON.stringify({ at: now, ...s })); } catch { /* storage full or blocked: the page still works, it just won't survive a refresh */ }
}

export function loadSession(store: Store, now = Date.now()): ReserveSession | null {
  try {
    const raw = store.getItem(KEY);
    if (!raw) return null;
    const { at, messages, quote, reservation, status } = JSON.parse(raw) as ReserveSession & { at: number };
    if (!Array.isArray(messages) || !(now - at < MAX_AGE)) { store.removeItem(KEY); return null; }
    // An unreserved quote past its expiry can no longer be reserved; don't show it as held.
    const live = quote && (reservation || Date.parse(quote.expiresAt) > now) ? quote : null;
    return { messages, quote: live, reservation: reservation ?? null, status: status ?? null };
  } catch {
    return null;
  }
}

export const clearSession = (store: Store) => { try { store.removeItem(KEY); } catch { /* ignore */ } };
