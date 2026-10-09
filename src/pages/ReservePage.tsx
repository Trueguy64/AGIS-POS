import { Fragment, useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { SendHorizontal } from "lucide-react";
import { chat, capture, getPayConfig, type ChatResponse, type QuoteCard, type ReservationStatus } from "../api/reservation";
import PayPalButton from "../components/reserve/PayPalButton";
import { RateStamp } from "../components/RateStamp";
import Wordmark from "../components/Wordmark";
import { useGoldRate } from "../contexts/GoldRateContext";
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
const STARTERS = ["A 1 baht gold necklace", "A ring under 20,000 THB", "A 10 g gold bar"];
const STEPS: [string, string][] = [
  ["Describe the piece", "Type, weight or budget — the assistant searches what is in stock."],
  ["Get a live quote", "Weight × purity × today's gold rate + labour fee. The quote holds for 15 minutes."],
  ["Pay a 10% deposit with PayPal", "Your piece and its price are held for 48 hours."],
  ["Collect in store", "Pay the balance at the counter and take it home."],
];

/** "฿1,578" when PayPal takes baht; "46.85 USD ≈ ฿1,578" when it takes another currency. */
const deposit = (q: QuoteCard) => (q.currency === "THB" ? thb(q.depositTHB) : `${q.depositAmount} ${q.currency} ≈ ${thb(q.depositTHB)}`);

/** Model replies are plain text, but **bold** sometimes slips through; render it instead of showing asterisks. */
function Rich({ text }: { text: string }) {
  return <>{text.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <strong key={i} className="font-semibold">{part}</strong> : <Fragment key={i}>{part}</Fragment>))}</>;
}

export default function ReservePage() {
  const rate = useGoldRate();
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
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages, quote, status, busy]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  async function say(raw: string) {
    const text = raw.trim().slice(0, 1000);
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
  const send = (e: FormEvent) => { e.preventDefault(); void say(input); };

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

  const showPay = reservation && pay && (status === "PENDING" || status === null);
  const statusText = status === "CAPTURING" && timedOut ? TIMEOUT_TEXT : status && status !== "PENDING" ? STATUS_TEXT[status] : null;

  return (
    <div className="flex min-h-screen flex-col bg-paper" lang="en">
      <header className="flex h-16 shrink-0 items-center justify-between gap-3 bg-brass-700 px-3 md:px-4">
        <Wordmark onBrass word="Reserve" />
        <RateStamp rate={rate} />
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-4 p-4 md:p-6 lg:grid-cols-[22rem_minmax(0,1fr)] lg:gap-5 lg:p-8">
        <aside className="flex flex-col gap-4 self-start rounded-slip border border-brass-300 bg-slip p-5 md:p-6" aria-labelledby="how-title">
          <div>
            <h1 id="how-title" className="text-display font-bold text-ink text-balance">Reserve gold online, collect it in store</h1>
            <p className="mt-2 text-ink-soft">Our assistant finds a piece, quotes it at today's live rate and holds it for you.</p>
          </div>
          <ol className="flex flex-col gap-3">
            {STEPS.map(([title, detail], i) => (
              <li key={title} className="flex items-center gap-3 lg:items-start">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brass-100 font-bold text-brass-800 tabular-nums" aria-hidden>{i + 1}</span>
                <span><span className="block font-semibold text-ink">{title}</span><span className="hidden text-ink-soft lg:block">{detail}</span></span>
              </li>
            ))}
          </ol>
          <p className="border-t border-dashed border-brass-500 pt-3 text-ink-muted">If the piece is not collected within 48 hours, the deposit is forfeited.</p>
        </aside>

        <section className="flex min-h-[32rem] flex-col rounded-slip border border-brass-300 bg-slip lg:h-[calc(100vh-8rem)]" aria-label="Reservation assistant">
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4 md:p-5" aria-live="polite">
            {messages.map((m, i) => (
              <p key={i} className={`max-w-[85%] whitespace-pre-line rounded-slip px-3 py-2 ${m.role === "user" ? "self-end bg-brass-100 text-ink" : "self-start bg-paper text-ink"}`}><Rich text={m.content} /></p>
            ))}

            {messages.length === 1 && !busy && (
              <div className="flex flex-wrap gap-2" aria-label="Suggestions">
                {STARTERS.map((s) => (
                  <button key={s} type="button" onClick={() => void say(s)} className="h-11 rounded-slip border border-brass-300 px-3 font-semibold text-brass-800 hover:bg-brass-100">{s}</button>
                ))}
              </div>
            )}

            {busy && <p className="self-start px-3 text-ink-muted" role="status">Checking the catalog…</p>}

            {quote && !reservation && (
              <div className="self-stretch rounded-slip border border-brass-500 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <p className="font-semibold text-ink">{quote.title}</p>
                  <p className="text-ink-muted">Quote held until {new Date(quote.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
                <dl className="mt-3 flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-3"><dt className="text-ink-soft">Price at today's rate</dt><dd className="text-money font-bold text-brass-800 tabular-nums">{thb(quote.priceTHB)}</dd></div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-ink-soft">Deposit to pay now</dt>
                    <dd className="font-semibold tabular-nums">{deposit(quote)}</dd>
                  </div>
                </dl>
                <p className="mt-3 border-t border-dashed border-brass-500 pt-3 text-ink-soft">{POLICY}</p>
                <p className="mt-2 font-semibold text-ink">To reserve it, send your name and a phone number or email.</p>
              </div>
            )}

            {showPay && (
              <div className="self-stretch rounded-slip border border-brass-500 p-4">
                <p className="font-bold text-ink">Pay the deposit to hold your piece</p>
                {quote && <p className="mb-3 text-ink-soft">{quote.title} · <span className="font-semibold text-ink tabular-nums">{deposit(quote)}</span></p>}
                <PayPalButton clientId={pay.paypalClientId} currency={reservation.currency} orderId={reservation.paypalOrderId} onApproved={onApproved} onError={onPayError} />
              </div>
            )}
            {statusText && <p className={`rounded-slip p-3 font-semibold ${status === "PAID" ? "border border-ok text-ok" : "bg-brass-100 text-ink"}`} role="status">{statusText}</p>}
            {status === "PENDING" && attempted && <p className="text-ink-soft">{STATUS_TEXT.PENDING}</p>}
            {error && <p className="rounded-slip bg-stamp-tint px-3 py-2 text-stamp" role="alert">{error}</p>}
            <div ref={end} />
          </div>

          <form onSubmit={send} className="flex gap-2 rounded-b-slip bg-paper p-3">
            <label className="sr-only" htmlFor="reserve-input">Message</label>
            <input id="reserve-input" value={input} onChange={(e) => setInput(e.target.value)} maxLength={1000} disabled={busy} autoComplete="off" className="h-12 min-w-0 flex-1 rounded-slip border border-brass-300 bg-slip px-3 text-ink placeholder:text-ink-muted focus:border-brass-700 focus:outline-none" placeholder="e.g. a 1 baht necklace under 50,000 THB" />
            <button type="submit" disabled={busy || !input.trim()} className="flex h-12 items-center gap-2 rounded-slip bg-brass-700 px-4 font-bold text-slip hover:bg-brass-800 disabled:cursor-not-allowed disabled:opacity-50">
              <SendHorizontal size={18} aria-hidden /> <span className="hidden sm:inline">Send</span><span className="sr-only sm:hidden">Send</span>
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
