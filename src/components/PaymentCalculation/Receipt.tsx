import { useEffect, useRef, useState } from "react";
import type { CartItem, GoldRate, Promo } from "../../types/types"
import type { PromoEnterData } from "../../schemas/promoSchemas";
import PromosInput from "./PromosInput";
import PromoCard from "./PromoCard";
import { LockedRateStamp, RateStamp } from "../RateStamp";
import { itemPrice, MONEY_COL, ratePerBaht, thb } from "../../lib/gold";
import Bi from "../Bi";
import { en, th } from "../../lib/i18n";

type ReceiptProps = {
    lines: CartItem[];
    promos: Promo[];
    onAddPromo?: (data: PromoEnterData) => Promise<void>;
    onDeletePromo?: (id: string) => void;
    onLock?: () => void;
    /** Stale rate can't be locked — show a hint and disable the Lock button. (audit 2026-10-08) */
    rateStale?: boolean;
    /** Re-fetch the live rate from the gold feed (the stamp's Retry path). */
    onRetryRate?: () => void;
    subtotal: number;
    discount: number;
    total: number;
    goldRate: number | null;    // THB per gram this receipt is priced at (live or locked)
    liveRate?: GoldRate | null; // while the sale is still being built: the live stamp
    lockedAt?: string;          // once Lock was pressed: the same stamp, struck
    interactable: boolean;
}

/**
 * The weigh slip. Lines, then discounts, then one rule, then Subtotal / Discount / Total.
 * The header's right slot holds the live stamp until Lock is pressed, then the struck one in the same place.
 */
function Receipt({ lines, promos, onAddPromo, onDeletePromo, onLock, rateStale, onRetryRate, subtotal, discount, total, goldRate, liveRate, lockedAt, interactable }: ReceiptProps) {
    const locked = Boolean(lockedAt && goldRate !== null);
    const headerRef = useRef<HTMLElement>(null);
    // Only pin the Lock button to the viewport bottom once the receipt header has
    // scrolled past the fold. Otherwise the sticky footer covers the "Receipt"
    // header as the receipt first appears on phones (audit P2).
    const [headerPast, setHeaderPast] = useState(false);
    useEffect(() => {
        const el = headerRef.current;
        if (!el || typeof IntersectionObserver === "undefined") return;
        const obs = new IntersectionObserver(
            (entries) => setHeaderPast(entries[0].boundingClientRect.bottom <= 0),
            { threshold: 0 }
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, []);
    return (
        <section className="flex min-h-0 w-full flex-1 flex-col" aria-labelledby="receipt-title">
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-t-slip border border-b-0 border-brass-300 bg-slip p-5">
                <header ref={headerRef} className="flex flex-wrap items-start justify-between gap-3">
                    <h2 id="receipt-title" className="shrink-0 whitespace-nowrap text-display font-bold text-ink"><Bi k="receipt" stack /></h2>
                    {locked
                        ? <LockedRateStamp thbPerGram={goldRate!} lockedAt={lockedAt!} struck />
                        : <RateStamp rate={liveRate ?? null} compact />}
                </header>

                {lines.length > 0 && goldRate !== null && (
                    <ul className="mt-5 flex flex-col gap-2">
                        {lines.map(({ item, quantity }) => (
                            <li key={item.id} className="flex items-baseline justify-between gap-3">
                                <span className="min-w-0 truncate">
                                    <span className="font-semibold text-ink">{item.title}</span>
                                    {quantity > 1 && <span className="text-ink-soft tabular-nums"> × {quantity}</span>}
                                </span>
                                <span className={`${MONEY_COL} tabular-nums`}>{thb(itemPrice(item, goldRate) * quantity)}</span>
                            </li>
                        ))}
                    </ul>
                )}

                {interactable && !locked && (
                    <div className="mt-4">
                        <PromosInput onSubmit={onAddPromo} />
                        {promos.length > 0 && (
                            <ul className="mt-3 flex flex-col gap-2">
                                {promos.map((promo) => (
                                    <PromoCard key={promo.id} promo={promo} onDelete={(id) => onDeletePromo?.(id)} />
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                <dl className="mt-auto flex flex-col gap-2 border-t border-brass-300 pt-3">
                    <div className="flex items-baseline justify-between gap-3">
                        <dt className="text-ink-soft"><Bi k="subtotal" /></dt>
                        <dd className={`${MONEY_COL} font-semibold`}>{thb(subtotal)}</dd>
                    </div>
                    {discount > 0 && (
                        <div className="flex items-baseline justify-between gap-3 text-stamp">
                            <dt><span lang="th">{th("discount")}</span> <span lang="en" className="opacity-80">{en("discount")}</span>{promos.length > 0 && <span className="text-compact"> · {promos.map(p => p.code).join(", ")}</span>}</dt>
                            <dd className={`${MONEY_COL} font-semibold`}>−{thb(discount)}</dd>
                        </div>
                    )}
                    <div className="flex items-end justify-between gap-3 pt-2">
                        <dt className="text-display font-bold text-ink"><Bi k="total" stack /></dt>
                        <dd className="text-display font-bold text-brass-800 tabular-nums">{thb(total)}</dd>
                    </div>
                </dl>
            </div>

            {/* The slip's perforation */}
            <div className="border-t border-dashed border-brass-500" aria-hidden />

            {/* Phones: stick Lock to the viewport bottom, but only once the user has
                scrolled past the receipt header, so it never covers the header as it
                first appears (audit P2). md+ has its own scroll panel and the footer
                is in normal flow. */}
            <div className={`rounded-b-slip border border-t-0 border-brass-300 bg-slip p-4 ${headerPast && interactable ? "sticky bottom-0" : ""} md:static ${interactable ? "" : "py-3"}`}>
                {interactable ? (
                    <>
                        {rateStale && !locked && (
                            <p className="mb-2 rounded-slip bg-stamp-tint p-2 text-stamp" role="alert">
                                <span lang="th">{th("rateStaleLock")}</span>
                                <span lang="en" className="block text-compact">{en("rateStaleLock")}</span>
                                {onRetryRate && (
                                    <>
                                        {" "}
                                        <button type="button" onClick={onRetryRate} className="font-bold underline hover:no-underline">
                                            <span lang="th">{th("retry")}</span> · <span lang="en">{en("retry")}</span>
                                        </button>
                                    </>
                                )}
                            </p>
                        )}
                        <button
                            type="button"
                            className="flex h-14 w-full items-center justify-center gap-3 rounded-slip bg-brass-700 px-4 text-slip hover:bg-brass-800 disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={onLock}
                            disabled={!goldRate || total <= 0 || locked || Boolean(rateStale)}
                            aria-busy={locked}
                        >
                            {goldRate ? (
                                <span className="flex flex-col items-center leading-tight">
                                    <span className="text-money font-bold" lang="th">{th("lockAndContinue")} <span className="tabular-nums">{thb(ratePerBaht(goldRate))}{th("perBaht")}</span></span>
                                    <span lang="en" className="text-compact opacity-80">{en("lockAndContinue")}</span>
                                </span>
                            ) : (
                                <Bi k="waitingForRate" stack className="items-center text-money font-bold" />
                            )}
                        </button>
                    </>
                ) : (
                    <p className="text-center text-ink-muted"><Bi k="lockedForSale" /></p>
                )}
            </div>
        </section>
    )
}

export default Receipt;
