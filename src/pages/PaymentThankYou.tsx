import { useEffect, useState } from "react";
import { Printer, ArrowLeft } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { Sale } from "../types/types";
import PrintableReceipt from "../components/PaymentCalculation/Printables/PrintableReceipt";
import { LockedRateStamp } from "../components/RateStamp";
import { MONEY_COL, receiptNo, thb } from "../lib/gold";
import { getSale } from "../api/sale";
import { clearSale } from "../lib/checkout";
import Bi from "../components/Bi";
import { en, th } from "../lib/i18n";

/** The recorded sale, loaded by receipt number so a refresh or a reopened tab shows the same slip. */
function PaymentThankYou() {
    const { saleId } = useParams();
    const navigate = useNavigate();
    const [sale, setSale] = useState<Sale | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!saleId) return;
        getSale(saleId).then(setSale).catch((err) => setError((err as Error).message));
    }, [saleId]);

    const newSale = () => { clearSale(); navigate('/'); };

    if (error) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-paper p-4">
                <section className="w-full max-w-md rounded-slip border border-brass-300 bg-slip p-6" role="alert">
                    <h1 className="text-display font-bold text-ink"><Bi k="saleNotFound" stack /></h1>
                    <p className="mt-2 text-ink-soft">{error}</p>
                    <Link to="/" className="mt-6 inline-flex h-12 items-center gap-2 rounded-slip bg-brass-700 px-5 font-bold text-slip hover:bg-brass-800"><ArrowLeft size={18} /> <Bi k="backToCatalog" thOnly /></Link>
                </section>
            </main>
        );
    }
    if (!sale) {
        return <main className="flex min-h-screen items-center justify-center bg-paper p-4 text-ink-muted" aria-busy="true"><Bi k="loadingSale" /></main>;
    }

    const pieces = sale.lines.reduce((n, l) => n + l.quantity, 0);

    return (
        <main className="min-h-screen bg-paper p-4 md:p-6 lg:p-8 print:bg-white print:p-0">
            {/* Only this block is visible under @media print */}
            <div className="hidden print:block" aria-hidden="true">
                <PrintableReceipt sale={sale} />
            </div>

            <section className="mx-auto flex max-w-2xl flex-col rounded-slip border border-brass-300 bg-slip p-6 md:p-8 print:hidden" aria-labelledby="paid-title">
                <div className="flex flex-col items-start gap-4 sm:flex-row sm:justify-between">
                    <div>
                        <h1 id="paid-title" className="text-display font-bold text-ink"><Bi k="paid" stack /></h1>
                        <p className="mt-1 text-ink-soft tabular-nums">{th("receiptNo")} {receiptNo(sale.id)} · {pieces} {th("pieces")} · {th(sale.payment === "Cash" ? "cash" : "promptpay")}</p>
                    </div>
                    <LockedRateStamp thbPerGram={sale.goldRate} lockedAt={sale.lockedAt} struck />
                </div>

                <ul className="mt-6 flex flex-col gap-1">
                    {sale.lines.map((l) => (
                        <li key={l.id} className="flex items-baseline justify-between gap-3">
                            <span className="min-w-0 truncate"><span className="font-semibold text-ink">{l.title}</span>{l.quantity > 1 && <span className="text-ink-soft tabular-nums"> × {l.quantity}</span>}</span>
                            <span className={`${MONEY_COL} tabular-nums`}>{thb(l.unitPrice * l.quantity)}</span>
                        </li>
                    ))}
                </ul>

                <dl className="mt-4 flex flex-col gap-2 border-t border-brass-300 pt-3">
                    <div className="flex justify-between gap-3"><dt className="text-ink-soft"><Bi k="subtotal" /></dt><dd className={`${MONEY_COL} font-semibold`}>{thb(sale.subtotal)}</dd></div>
                    {sale.discount > 0 && <div className="flex justify-between gap-3 text-stamp"><dt><span lang="th">{th("discount")}</span> <span lang="en" className="opacity-80">{en("discount")}</span>{sale.promoCodes && <span className="text-compact"> · {sale.promoCodes}</span>}</dt><dd className={`${MONEY_COL} font-semibold`}>−{thb(sale.discount)}</dd></div>}
                    {(sale.depositPaid ?? 0) > 0 && <div className="flex justify-between gap-3 text-stamp"><dt><Bi k="depositPaid" /></dt><dd className={`${MONEY_COL} font-semibold`}>−{thb(sale.depositPaid ?? 0)}</dd></div>}
                    <div className="flex items-end justify-between gap-3 pt-2"><dt className="text-display font-bold"><Bi k="total" stack /></dt><dd className="text-display font-bold text-brass-800 tabular-nums">{thb(sale.total)}</dd></div>
                    <div className="flex justify-between gap-3 border-t border-dashed border-brass-500 pt-3"><dt className="text-ink-soft"><Bi k="paidAmount" /></dt><dd className={`${MONEY_COL} text-money font-semibold`}>{thb(sale.amountPaid)}</dd></div>
                    {sale.payment === 'Cash' && <div className="flex justify-between gap-3"><dt className="text-ink-soft"><Bi k="change" /></dt><dd className={`${MONEY_COL} text-money font-bold text-ok`}>{thb(sale.change)}</dd></div>}
                </dl>

                <div className="mt-8 flex flex-col gap-3 md:flex-row">
                    <button type="button" onClick={() => window.print()} className="flex h-14 flex-1 items-center justify-center gap-2 rounded-slip bg-brass-700 text-slip hover:bg-brass-800">
                        <Printer size={24} /> <Bi k="printReceipt" stack className="items-center text-money font-bold" />
                    </button>
                    <button type="button" onClick={newSale} className="flex h-14 flex-1 items-center justify-center gap-2 rounded-slip border border-brass-300 text-ink hover:bg-paper">
                        <ArrowLeft size={20} /> <Bi k="newSale" stack className="items-center text-money font-bold" />
                    </button>
                </div>
            </section>
        </main>
    );
}
export default PaymentThankYou;
