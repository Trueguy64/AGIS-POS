import { useEffect, useRef } from "react";
import type { GoldRate } from "../types/types";
import { formatDateTime, formatTime, ratePerBaht, thb, thbPerGramText } from "../lib/gold";
import { useGoldRateStatus } from "../contexts/GoldRateContext";
import { both, en, th } from "../lib/i18n";

/** Renders text so that only the characters that changed since the last render roll in. */
function RollingText({ text }: { text: string }) {
  return (
    <span className="inline-flex overflow-hidden">
      {[...text].map((ch, i) => (
        <span key={`${i}-${ch}`} className="roll-in inline-block">{ch}</span>
      ))}
    </span>
  );
}

const label = "whitespace-nowrap text-compact font-bold uppercase tracking-wide leading-none";
const frame = "rounded-slip border-[3px] border-double border-stamp bg-slip text-stamp";

type LiveProps = { rate: GoldRate | null; compact?: boolean };
type LoadedProps = { rate: GoldRate; compact?: boolean };

/**
 * The live rate as a red rubber stamp, for the top bar and the working receipt.
 * Leads with the counter's number, ornament gold per baht-weight; per-gram pure gold is the formula input
 * and lives in the tappable detail. The time sits inline because the stamp lives in a 48px bar.
 */
export function RateStamp({ rate, compact = false }: LiveProps) {
  const { status, retry } = useGoldRateStatus();

  if (!rate) {
    if (status === "unavailable") {
      return (
        <div className="flex h-12 items-center gap-3 rounded-slip border-[3px] border-dashed border-stamp bg-slip px-3 text-stamp" role="alert">
          <span lang="th" className="font-semibold">{th("rateUnavailable")}</span>
          <button type="button" onClick={retry} className="h-8 rounded-slip bg-stamp px-3 font-bold text-slip hover:opacity-90">
            {th("retry")} <span lang="en" className="font-normal">{en("retry")}</span>
          </button>
        </div>
      );
    }
    return (
      <div className="flex h-12 items-center rounded-slip border-[3px] border-dashed border-stamp/50 bg-slip px-3 text-stamp" role="status" aria-label={both("rateLoading")}>
        <span lang="th">{th("rateLoading")}</span>
      </div>
    );
  }

  return <LivePopover rate={rate} compact={compact} />;
}

/** The live rate popover. Mounted only when we actually have a rate, so the dismissal listeners
 *  attach to a real element on first render and self-clean when the rate goes away or the page
 *  unmounts. Native <details> only re-toggles on summary click; we add Escape and outside-click
 *  to match WCAG 1.4.13. The pointerdown handler ignores summary clicks so the toggle stays. */
function LivePopover({ rate, compact }: LoadedProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const el = detailsRef.current;
    if (!el) return;
    const onPointerDown = (e: PointerEvent) => {
      if (el.open && !el.contains(e.target as Node)) el.removeAttribute("open");
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && el.open) el.removeAttribute("open");
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const perBaht = ratePerBaht(rate.thbPerGram);
  const { stale } = rate;

  return (
    <details ref={detailsRef} className="group relative">
      <summary
        className={`flex h-12 list-none flex-col items-start justify-center gap-0 px-2 sm:flex-row sm:items-center sm:gap-3 sm:px-3 ${frame} cursor-pointer select-none [&::-webkit-details-marker]:hidden`}
        aria-label={`${both("rate")}: ${th("ornament")} ${thb(perBaht)} ${th("perBaht")}${stale ? `, ${both("stale")}` : ""}`}
      >
        <span className={label} lang="th">{th("ornament")}</span>
        <span className="whitespace-nowrap font-bold leading-none sm:text-display">
          <RollingText text={thb(perBaht)} />
          <span className="text-compact font-semibold" lang="th"> {th("perBaht")}</span>
        </span>
        {!compact && <span className="hidden leading-none md:inline" aria-hidden>{formatTime(rate.updatedAt)}</span>}
        {stale && <span className="rounded-sm bg-stamp px-1.5 py-0.5 font-bold leading-none text-slip" lang="th">{th("stale")}</span>}
      </summary>

      <div className="absolute right-0 z-40 mt-2 w-80 rounded-slip border border-brass-300 bg-slip p-4 text-ink shadow-none">
        <p className="font-semibold">{th("rateDetails")} <span lang="en" className="font-normal text-ink-muted">{en("rateDetails")}</span></p>
        <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
          <dt lang="th" className="text-ink-soft">{th("ornament")} <span lang="en" className="text-ink-muted">{en("ornament")}</span></dt><dd className="text-right font-semibold tabular-nums">{thb(perBaht)} {th("perBaht")}</dd>
          <dt lang="th" className="text-ink-soft">{th("bar")} <span lang="en" className="text-ink-muted">{en("bar")}</span></dt><dd className="text-right font-semibold tabular-nums">{thb(ratePerBaht(rate.thbPerGram, "bar"))} {th("perBaht")}</dd>
          <dt lang="th" className="text-ink-soft">{en("perGram")}</dt><dd className="text-right font-semibold tabular-nums">{thbPerGramText(rate.thbPerGram)}</dd>
          <dt className="text-ink-soft">XAU/USD</dt><dd className="text-right tabular-nums">{rate.usdPerOunce.toFixed(2)}</dd>
          <dt className="text-ink-soft">USD/THB</dt><dd className="text-right tabular-nums">{rate.usdToThb.toFixed(2)}</dd>
          <dt lang="th" className="text-ink-soft">{th("updated")}</dt><dd className="text-right tabular-nums">{formatDateTime(rate.updatedAt)}</dd>
        </dl>
      </div>
    </details>
  );
}

type LockedProps = { thbPerGram: number; lockedAt: string; struck?: boolean };

/** The locked rate struck onto a receipt. `struck` plays the strike once on mount. Same label everywhere. */
export function LockedRateStamp({ thbPerGram, lockedAt, struck = false }: LockedProps) {
  return (
    <div className={`inline-flex max-w-full flex-col px-4 py-2 ${frame} ${struck ? "stamp-strike" : "-rotate-2"}`} role="status">
      <span className={label} lang="th">{th("rateLocked")} <span lang="en" className="font-semibold normal-case tracking-normal opacity-80">{en("rateLocked")}</span></span>
      <span className="whitespace-nowrap text-display font-bold leading-none">
        {thb(ratePerBaht(thbPerGram))}<span className="text-compact font-semibold" lang="th"> {th("perBaht")}</span>
      </span>
      <span className="leading-tight">{thbPerGramText(thbPerGram)} {th("perGram").replace(" ทองคำบริสุทธิ์", "")} · {formatDateTime(lockedAt)}</span>
    </div>
  );
}
