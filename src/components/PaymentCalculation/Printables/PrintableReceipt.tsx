import type { Sale } from "../../../types/types";
import { LockedRateStamp } from "../../RateStamp";
import { describeGold, formatDateTime, receiptNo, thb } from "../../../lib/gold";
import Wordmark from "../../Wordmark";
import { en, th, type StrKey } from "../../../lib/i18n";

type Props = { sale: Sale };

/** The printed slip, from the recorded sale: black on white, the same money column, the same stamp. */
export default function PrintableReceipt({ sale }: Props) {
    const row = (k: StrKey) => <>{th(k)} <span className="text-ink-muted">{en(k)}</span></>;
    const head = (k: StrKey) => <>{th(k)}<span className="block font-normal text-ink-muted">{en(k)}</span></>;
    return (
        <div className="mx-auto max-w-2xl bg-white p-8 text-ink">
            <header className="flex items-start justify-between gap-6 border-b border-ink pb-4">
                <div>
                    <Wordmark />
                    <p className="mt-1 font-semibold">{th("receipt")} <span className="font-normal text-ink-muted">{en("receipt")}</span> {receiptNo(sale.id)}</p>
                </div>
                <LockedRateStamp thbPerGram={sale.goldRate} lockedAt={sale.lockedAt} />
            </header>

            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-0.5">
                <dt className="text-ink-soft">{row("cashier")}</dt><dd>{sale.cashierName}</dd>
                <dt className="text-ink-soft">{row("paymentMethod")}</dt><dd>{th(sale.payment === "Cash" ? "cash" : "promptpay")} <span className="text-ink-muted">{sale.payment}</span></dd>
                <dt className="text-ink-soft">{row("printedAt")}</dt><dd className="tabular-nums">{formatDateTime(new Date().toISOString())}</dd>
            </dl>

            <table className="mt-6 w-full border-collapse">
                <thead>
                    <tr className="border-b border-ink text-left align-bottom text-ink-soft">
                        <th className="w-8 py-2 font-semibold">#</th>
                        <th className="py-2 font-semibold">{head("item")}</th>
                        <th className="w-24 py-2 text-right font-semibold">{head("unitPrice")}</th>
                        <th className="w-16 py-2 pl-2 text-right font-semibold">{head("qty")}</th>
                        <th className="w-32 py-2 text-right font-semibold">{head("amount")}</th>
                    </tr>
                </thead>
                <tbody>
                    {sale.lines.map((line, index) => (
                        <tr key={line.id} className="align-top">
                            <td className="py-2 text-ink-soft tabular-nums">{index + 1}</td>
                            <td className="py-2">
                                <span className="font-semibold">{line.title}</span>
                                <span className="block text-ink-soft">{describeGold(line)}</span>
                                <span className="block text-ink-muted">{th("laborFee")} {thb(line.laborFee)}</span>
                            </td>
                            <td className="py-2 text-right tabular-nums">{thb(line.unitPrice)}</td>
                            <td className="py-2 text-right tabular-nums">{line.quantity}</td>
                            <td className="py-2 text-right tabular-nums">{thb(line.unitPrice * line.quantity)}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="border-t border-ink">
                        <td colSpan={4} className="py-2 pr-6 text-right text-ink-soft">{row("subtotal")}</td>
                        <td className="w-32 py-2 text-right tabular-nums">{thb(sale.subtotal)}</td>
                    </tr>
                    {sale.discount > 0 && (
                        <tr>
                            <td colSpan={4} className="py-1 pr-6 text-right text-ink-soft">{row("discount")}{sale.promoCodes && ` · ${sale.promoCodes}`}</td>
                            <td className="w-32 py-1 text-right tabular-nums">−{thb(sale.discount)}</td>
                        </tr>
                    )}
                    {(sale.depositPaid ?? 0) > 0 && (
                        <tr>
                            <td colSpan={4} className="py-1 pr-6 text-right text-ink-soft">{row("depositPaid")}</td>
                            <td className="w-32 py-1 text-right tabular-nums">−{thb(sale.depositPaid ?? 0)}</td>
                        </tr>
                    )}
                    <tr>
                        <td colSpan={4} className="pr-6 pt-3 text-right text-display font-bold">{th("total")} <span className="text-compact font-normal text-ink-muted">{en("total")}</span></td>
                        <td className="w-32 pt-3 text-right text-display font-bold tabular-nums">{thb(sale.total)}</td>
                    </tr>
                    <tr>
                        <td colSpan={4} className="pr-6 pt-2 text-right text-ink-soft">{row("paidAmount")}</td>
                        <td className="w-32 pt-2 text-right tabular-nums">{thb(sale.amountPaid)}</td>
                    </tr>
                    {sale.payment === "Cash" && (
                        <tr>
                            <td colSpan={4} className="pr-6 text-right text-ink-soft">{row("change")}</td>
                            <td className="w-32 text-right tabular-nums">{thb(sale.change)}</td>
                        </tr>
                    )}
                </tfoot>
            </table>

            <p className="mt-8 text-ink-soft">{th("formula")}</p>
            <p className="text-ink-muted">{en("formula")}</p>
        </div>
    )
}
