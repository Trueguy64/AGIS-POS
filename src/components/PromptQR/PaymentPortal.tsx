import PromptPayQR from './PromptQR';
import type { CartItem, PaymentOption, Promo, RateLock } from '../../types/types';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from "../../contexts/AuthContext";
import { useGoldRate } from '../../contexts/GoldRateContext';
import { Check, X } from 'lucide-react';
import thaiQrLogo from '../../assets/PromptQR/Thai_QR_Logo.svg';
import { formatTime, LOCK_REVIEW_AFTER_MS, ratePerBaht, thb } from '../../lib/gold';
import { clearSale, newSaleKey, quickAmounts } from '../../lib/checkout';
import { createSale } from '../../api/sale';
import { getShop } from '../../api/shop';
import Dialog from '../Dialog';
import Bi from '../Bi';
import { both, th } from '../../lib/i18n';

type Totals = { subtotal: number; discount: number; total: number };

type PaymentProps = {
    lines: CartItem[];
    promos: Promo[];
    lock: RateLock;
    totals: Totals;
    paymentType: PaymentOption;
    onRelock: (lock: RateLock) => void;
    onClose: () => void;
};

const digits = (s: string) => s.replace(/[^\d]/g, "");
const grouped = (s: string) => (s ? Number(s).toLocaleString("en-US") : "");

function PaymentPortal({ lines, promos, lock, totals, paymentType, onRelock, onClose }: PaymentProps) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const live = useGoldRate();
    const [cashText, setCashText] = useState("");
    const [transferChecked, setTransferChecked] = useState(false);
    const [error, setError] = useState("");
    const [pending, setPending] = useState(false);
    const [shopPromptPay, setShopPromptPay] = useState<string | null | undefined>(undefined);

    useEffect(() => { getShop().then((s) => setShopPromptPay(s.promptPayId)).catch(() => setShopPromptPay(null)); }, []);

    const total = totals.total;
    const cashGiven = cashText === "" ? null : Number(cashText);
    const change = cashGiven !== null ? cashGiven - total : null;

    // An old lock with a moved market asks the cashier to keep or relock before taking money.
    const [lockOld] = useState(() => Date.now() - Date.parse(lock.lockedAt) > LOCK_REVIEW_AFTER_MS);
    const rateMoved = live && Math.abs(live.thbPerGram - lock.goldRate) >= 0.005;
    const lockNeedsReview = lockOld && Boolean(rateMoved);
    const [lockReviewed, setLockReviewed] = useState(false);

    const promptPayId = shopPromptPay ?? user?.phone ?? null;
    const canConfirm = !pending && (lockNeedsReview ? lockReviewed : true) &&
        (paymentType === "Cash" ? cashGiven !== null && cashGiven >= total : Boolean(promptPayId) && transferChecked);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!canConfirm) return;
        setError("");
        setPending(true);
        try {
            const sale = await createSale({
                payment: paymentType,
                amountPaid: paymentType === "Cash" ? cashGiven! : total,
                goldRate: lock.goldRate,
                lockedAt: lock.lockedAt,
                saleKey: lock.saleKey,
                promoCodes: promos.map((p) => p.code),
                lines: lines.map((l) => ({ itemId: l.item.id, quantity: l.quantity })),
            });
            clearSale();
            navigate(`/payment/thankyou/${sale.id}`);
        } catch (err) {
            setError((err as Error).message);
            setPending(false);
        }
    }

    const confirmButton = (
        <button type="submit" disabled={!canConfirm} className="flex h-14 w-full items-center justify-center gap-2 rounded-slip bg-brass-700 text-slip hover:bg-brass-800 disabled:cursor-not-allowed disabled:opacity-50" aria-busy={pending}>
            <Check size={24} />
            <Bi k={pending ? "confirmingPayment" : "confirmPayment"} stack className="items-center text-money font-bold" />
        </button>
    );

    const lockReview = lockNeedsReview && live && (
        <div className="rounded-slip bg-brass-100 p-3" role="group" aria-label={both("lockOld")}>
            <p className="font-semibold text-brass-800"><Bi k="lockOld" /></p>
            <p className="text-ink-soft tabular-nums">{th("rateLocked")} {thb(ratePerBaht(lock.goldRate))}{th("perBaht")} · {formatTime(lock.lockedAt)} → {th("rate")} {thb(ratePerBaht(live.thbPerGram))}{th("perBaht")}</p>
            <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => setLockReviewed(true)} className={`h-11 flex-1 rounded-slip border font-semibold ${lockReviewed ? "border-brass-700 bg-slip text-brass-800" : "border-brass-700 text-brass-800 hover:bg-slip"}`}><Bi k="keepLocked" thOnly /></button>
                <button type="button" onClick={() => { onRelock({ goldRate: live.thbPerGram, lockedAt: new Date().toISOString(), saleKey: newSaleKey() }); setLockReviewed(true); }} className="h-11 flex-1 rounded-slip bg-brass-700 font-semibold text-slip hover:bg-brass-800"><Bi k="relock" thOnly /></button>
            </div>
        </div>
    );

    const errorNote = error && (
        <p className="rounded-slip bg-stamp-tint p-3 text-stamp" role="alert"><span className="font-semibold">{th("saleFailed")}</span> · {error}</p>
    );

    return (
        <Dialog label={both(paymentType === "Cash" ? "cash" : "promptpay")} onClose={onClose}>
            {paymentType === 'PromptPay' ? (
                <form onSubmit={handleSubmit} className="flex min-h-0 flex-col overflow-y-auto">
                    <div className="flex items-center justify-between bg-qr-navy p-4">
                        <img src={thaiQrLogo} alt="Thai QR Payment" className="h-10" />
                        <button type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-slip text-slip hover:bg-white/10" aria-label={both("close")}><X size={22} /></button>
                    </div>
                    <div className="flex flex-col gap-4 p-5">
                        {lockReview}
                        {promptPayId ? (
                            <>
                                <PromptPayQR id={promptPayId} amount={total} size={260} />
                                {shopPromptPay === null && user?.phone && (
                                    <p className="text-center text-ink-muted">{th("promptpay")}: {user.phone} ({user.name})</p>
                                )}
                                <label className="flex items-start gap-3 rounded-slip border border-brass-300 p-3">
                                    <input type="checkbox" checked={transferChecked} onChange={(e) => setTransferChecked(e.target.checked)} className="mt-1 h-5 w-5 accent-brass-700" />
                                    <span className="font-semibold text-ink"><Bi k="transferChecked" /></span>
                                </label>
                                {errorNote}
                                {confirmButton}
                            </>
                        ) : (
                            <p className="rounded-slip bg-stamp-tint p-4 text-stamp" role="alert"><Bi k="noPhone" /></p>
                        )}
                    </div>
                </form>
            ) : (
                <form onSubmit={handleSubmit} className="flex min-h-0 flex-col gap-4 overflow-y-auto p-5">
                    <div className="flex items-start justify-between gap-3">
                        <h2 className="text-display font-bold text-ink"><Bi k="cashGiven" stack /></h2>
                        <button type="button" onClick={onClose} className="-mr-2 -mt-1 flex h-11 w-11 items-center justify-center rounded-slip text-ink-soft hover:bg-paper hover:text-stamp" aria-label={both("close")}><X size={22} /></button>
                    </div>
                    {lockReview}
                    <label className="flex flex-col gap-1">
                        <span className="text-ink-soft"><Bi k="cashGivenHint" /></span>
                        <div className="flex h-14 items-center rounded-slip border border-brass-300 bg-slip px-3 focus-within:border-brass-700">
                            <span className="text-display font-bold text-ink-muted">฿</span>
                            <input
                                type="text"
                                inputMode="numeric"
                                autoComplete="off"
                                autoFocus
                                placeholder="0"
                                className="h-full w-full bg-transparent pl-1 text-display font-bold text-ink tabular-nums focus:outline-none"
                                value={grouped(cashText)}
                                onChange={(e) => { setError(""); setCashText(digits(e.target.value)); }}
                                aria-label={both("cashGiven")}
                            />
                        </div>
                    </label>
                    <div className="flex flex-wrap gap-2" role="group" aria-label={both("cashGiven")}>
                        {quickAmounts(total).map((n, i) => (
                            <button type="button" key={n} onClick={() => { setError(""); setCashText(String(n)); }}
                                className={`h-11 rounded-slip border px-3 font-semibold tabular-nums ${cashGiven === n ? "border-brass-700 bg-brass-100 text-brass-800" : "border-brass-300 text-ink hover:bg-paper"}`}>
                                {thb(n)}{i === 0 && <span className="ml-1 text-compact font-normal text-ink-muted" lang="th">{th("exact")}</span>}
                            </button>
                        ))}
                    </div>
                    <dl className="flex flex-col gap-1">
                        <div className="flex items-baseline justify-between"><dt className="text-ink-soft"><Bi k="totalDue" /></dt><dd className="text-money font-semibold tabular-nums">{thb(total)}</dd></div>
                        <div className="flex items-baseline justify-between">
                            <dt className="text-ink-soft"><Bi k={change !== null && change < 0 ? "short" : "change"} /></dt>
                            <dd className={`text-money font-bold tabular-nums ${change !== null && change < 0 ? "text-stamp" : "text-ok"}`} aria-live="polite">{change === null ? "—" : thb(Math.abs(change))}</dd>
                        </div>
                    </dl>
                    {errorNote}
                    {confirmButton}
                </form>
            )}
        </Dialog>
    );
}

export default PaymentPortal;
