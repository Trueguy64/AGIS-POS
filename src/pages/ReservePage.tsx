import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { chat, capture, getPayConfig, type ChatResponse, type QuoteCard, type ReservationStatus } from "../api/reservation";
import PayPalButton from "../components/reserve/PayPalButton";
import { thb } from "../lib/gold";

type Msg = { role: "user" | "assistant"; content: string };
const POLICY = "The deposit holds this piece and this price for 48 hours. If it is not collected in time, the deposit is forfeited.";
const STATUS_TEXT: Partial<Record<ReservationStatus, string>> = {
  PAID: "Deposit paid. Your piece is held for 48 hours — show your name at the counter.",
  CAPTURING: "Payment received, confirming with PayPal…",
  REVIEW: "Payment received; the shop will confirm it shortly.",
  PENDING: "The payment did not go through. You can try the PayPal button again.",
  CANCELLED: "This reservation expired. Ask for a fresh quote.",
  EXPIRED: "This reservation expired. Ask for a fresh quote.",
  COLLECTED: "This reservation has been collected.",
};
const TIMEOUT_TEXT = "Still confirming with PayPal. The shop will see your payment; you can close this page.";

export default function ReservePage() {
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: "Hello! I can find a gold piece, quote today's price and hold it for you with a 10% PayPal deposit. What are you looking for?" }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [quote, setQuote] = useState<QuoteCard | null>(null);
  const [reservation, setReservation] = useState<ChatResponse["reservation"] | null>(null);
  const [status, setStatus] = useState<ReservationStatus | null>(null);
  const [pay, setPay] = useState<{ paypalClientId: string; currency: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false); // a capture response has come back PENDING (a real refusal)
  const [timedOut, setTimedOut] = useState(false); // the 2-minute polling window ended while still CAPTURING
  const end = useRef<HTMLDivElement>(null);
  const mounted = useRef(true);
  const inFlight = useRef(false); // a polling loop is already running for this component

  useEffect(() => { getPayConfig().then(setPay).catch(() => setError("Payments are unavailable right now.")); }, []);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, quote, status]);
  useEffect(() => () => { mounted.current = false; }, []);

  async function send(e: FormEvent) {
    e.preventDefault();
    const text = input.trim().slice(0, 1000);
    if (!text || busy) return;
    const next = [...messages, { role: "user" as const, content: text }].slice(-20);
    setMessages(next); setInput(""); setBusy(true); setError(null);
    try {
      const r = await chat(next, reservation ? undefined : quote?.quoteId);
      setMessages((m) => [...m, { role: "assistant" as const, content: r.reply }].slice(-20));
      if (r.quote) setQuote(r.quote);
      if (r.reservation) { setReservation(r.reservation); setStatus("PENDING"); } // clears activeQuoteId on later turns
    } catch (err) {
      setError((err as Error).message);
    } finally { setBusy(false); }
  }

  // Poll the capture endpoint itself while CAPTURING: safe to repeat, and it can take over a stale claim (§4.3).
  const onApproved = useCallback(async () => {
    if (!reservation || inFlight.current) return;
    inFlight.current = true;
    setAttempted(false);
    setTimedOut(false);
    setStatus("CAPTURING"); // optimistic: hide PayPal button until we hear back
    const started = Date.now();
    try {
      for (;;) {
        const r = await capture(reservation.reservationId).catch(() => null);
        if (!mounted.current) return;
        if (r) {
          setStatus(r.status);
          if (r.status === "PENDING") setAttempted(true); // only a real PayPal refusal flags attempted
          if (r.status !== "CAPTURING") return;
        }
        // a network error (r is null) keeps CAPTURING and we keep polling inside the 2-minute window
        if (Date.now() - started > 120_000) { setTimedOut(true); return; }
        await new Promise((ok) => setTimeout(ok, 5000));
      }
    } finally {
      inFlight.current = false;
    }
  }, [reservation]);
  const onPayError = useCallback((m: string) => setError(m), []);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 bg-paper p-4" lang="en">
      <h1 className="text-display font-bold text-ink">Reserve a gold piece</h1>
      <section className="flex flex-1 flex-col gap-3 rounded-slip border border-brass-300 bg-slip p-4" aria-live="polite">
        {messages.map((m, i) => (
          <p key={i} className={m.role === "user" ? "self-end rounded-slip bg-brass-100 px-3 py-2 text-ink" : "self-start text-ink"}>{m.content}</p>
        ))}
        {quote && !reservation && (
          <div className="rounded-slip border border-brass-500 p-3">
            <p className="font-semibold">{quote.title}</p>
            <p className="text-money font-bold tabular-nums">{thb(quote.priceTHB)}</p>
            <p>Deposit: <span className="tabular-nums">{quote.depositAmount} {quote.currency}</span>{quote.currency !== "THB" && <> (≈ {thb(quote.depositTHB)})</>}</p>
            <p className="text-ink-soft">Quote valid until {new Date(quote.expiresAt).toLocaleTimeString()}. {POLICY}</p>
          </div>
        )}
        {reservation && pay && (status === "PENDING" || status === null) && (
          <PayPalButton clientId={pay.paypalClientId} currency={reservation.currency} orderId={reservation.paypalOrderId} onApproved={onApproved} onError={onPayError} />
        )}
        {status === "CAPTURING" && timedOut
          ? <p className="rounded-slip bg-brass-100 p-3 font-semibold" role="status">{TIMEOUT_TEXT}</p>
          : status && status !== "PENDING" && <p className="rounded-slip bg-brass-100 p-3 font-semibold" role="status">{STATUS_TEXT[status]}</p>}
        {status === "PENDING" && attempted && <p className="text-ink-soft">{STATUS_TEXT.PENDING}</p>}
        {error && <p className="text-stamp" role="alert">{error}</p>}
        <div ref={end} />
      </section>
      <form onSubmit={send} className="flex gap-2">
        <label className="sr-only" htmlFor="reserve-input">Message</label>
        <input id="reserve-input" value={input} onChange={(e) => setInput(e.target.value)} maxLength={1000} disabled={busy} className="h-12 flex-1 rounded-slip border border-brass-300 bg-slip px-3" placeholder="e.g. a 1 baht necklace under 50,000 THB" />
        <button type="submit" disabled={busy || !input.trim()} className="h-12 rounded-slip bg-brass-700 px-5 font-semibold text-slip disabled:opacity-50">{busy ? "…" : "Send"}</button>
      </form>
    </main>
  );
}
