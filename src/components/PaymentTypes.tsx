import { Banknote, QrCode, X } from "lucide-react"
import { useState } from "react";
import type { CartItem, PaymentOption, Promo, RateLock } from "../types/types";
import PaymentPortal from "./PromptQR/PaymentPortal";
import { useNavigate } from "react-router-dom";
import { thb } from "../lib/gold";
import { clearLock } from "../lib/checkout";
import Bi from "./Bi";

type Totals = { subtotal: number; discount: number; total: number };

type PaymentProps = {
    lines: CartItem[];
    promos: Promo[];
    lock: RateLock;
    totals: Totals;
    onRelock: (lock: RateLock) => void;
}

const option = "flex h-40 flex-1 flex-col items-center justify-center gap-3 rounded-slip border border-brass-300 bg-slip text-ink hover:border-brass-700 hover:bg-paper";

function PaymentTypes({ lines, promos, lock, totals, onRelock }: PaymentProps) {
    const [selectedPayment, setSelectedPayment] = useState<PaymentOption | null>(null);
    const navigate = useNavigate();

    const cancel = () => { clearLock(); navigate('/payment'); };

    return (
        <section className="flex w-full flex-[2] flex-col rounded-slip border border-brass-300 bg-slip p-5 md:p-6" aria-labelledby="pay-title">
            <h1 id="pay-title" className="text-display font-bold text-ink"><Bi k="howPaying" stack /></h1>
            {/* The receipt beside this panel shows the total on counter screens; phones see it here, above the fold. */}
            <p className="mt-2 text-ink-soft md:hidden"><Bi k="totalDue" /> <span className="text-money font-bold text-brass-800 tabular-nums">{thb(totals.total)}</span></p>

            <div className="mt-8 flex flex-1 flex-col justify-center">
                <div className="flex flex-col gap-4 md:flex-row">
                    <button type="button" className={option} onClick={() => setSelectedPayment("Cash")}>
                        <Banknote size={48} className="text-brass-700" strokeWidth={1.5} />
                        <span className="text-display font-bold"><Bi k="cash" stack className="items-center" /></span>
                    </button>
                    <button type="button" className={option} onClick={() => setSelectedPayment("PromptPay")}>
                        <QrCode size={48} className="text-brass-700" strokeWidth={1.5} />
                        <span className="text-display font-bold"><Bi k="promptpay" stack className="items-center" /></span>
                    </button>
                </div>

                <button
                    type="button"
                    onClick={cancel}
                    className="mt-8 flex min-h-12 items-center justify-center gap-2 rounded-slip border border-stamp px-4 py-2 font-semibold text-stamp hover:bg-stamp-tint"
                >
                    <X size={18} className="shrink-0" />
                    <Bi k="cancelToBag" stack className="items-center text-center" />
                </button>
            </div>

            {selectedPayment && (
                <PaymentPortal
                    lines={lines}
                    promos={promos}
                    lock={lock}
                    totals={totals}
                    paymentType={selectedPayment}
                    onRelock={onRelock}
                    onClose={() => setSelectedPayment(null)} />
            )}
        </section>
    );
}
export default PaymentTypes
