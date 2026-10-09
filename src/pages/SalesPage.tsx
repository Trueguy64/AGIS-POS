import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, FileDown } from "lucide-react";
import Bi from "../components/Bi";
import { listSales, salesPdfUrl, type SalesReport } from "../api/sale";
import { useAuth } from "../contexts/AuthContext";
import { receiptNo, thb } from "../lib/gold";
import { both, th } from "../lib/i18n";

const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local
/** Local calendar days → [start of `from`, start of the day after `to`) as instants. */
const toRange = (from: string, to: string) => {
  const end = new Date(`${to}T00:00`);
  end.setDate(end.getDate() + 1);
  return [new Date(`${from}T00:00`).toISOString(), end.toISOString()] as const;
};

/** Everyone sees the day's sales; only managers get the PDF (the server enforces it too). */
export default function SalesPage() {
  const { user } = useAuth();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [report, setReport] = useState<SalesReport | null>(null);
  const [error, setError] = useState("");
  const valid = from !== "" && to !== "" && from <= to;
  const [fromIso, toIso] = valid ? toRange(from, to) : ["", ""];

  useEffect(() => {
    if (!fromIso) return;
    let live = true;
    listSales(fromIso, toIso)
      .then((r) => { if (live) { setReport(r); setError(""); } })
      .catch((e) => live && setError((e as Error).message));
    return () => { live = false; };
  }, [fromIso, toIso]);

  const s = report?.summary;
  const tiles: [string, string][] = s ? [
    [both("salesCount"), String(s.count)],
    [both("takenAtCounter"), thb(s.total)],
    [both("cash"), thb(s.cash)],
    [both("promptpay"), thb(s.promptPay)],
  ] : [];
  const input = "h-11 rounded-slip border border-brass-300 bg-slip px-3 text-ink";

  return (
    <main className="min-h-screen bg-paper p-4 md:p-6 lg:p-8">
      <header className="flex flex-wrap items-end gap-3">
        <Link to="/" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-slip border border-brass-300 text-ink hover:bg-slip" aria-label={both("backToCatalog")}>
          <ArrowLeft size={20} />
        </Link>
        <h1 className="mr-auto text-display font-bold text-ink"><Bi k="sales" stack /></h1>
        <label className="flex flex-col gap-1 text-ink-soft"><Bi k="dateFrom" /><input type="date" className={input} value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="flex flex-col gap-1 text-ink-soft"><Bi k="dateTo" /><input type="date" className={input} value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} /></label>
        {user?.role === "Manager" && valid && (
          <a href={salesPdfUrl(fromIso, toIso)} className="flex min-h-11 items-center gap-2 rounded-slip bg-brass-700 px-4 py-1 font-bold text-slip hover:bg-brass-800">
            <FileDown size={18} /> <Bi k="downloadPdf" stack />
          </a>
        )}
      </header>

      {error && <p className="mt-4 text-stamp" role="alert">{error}</p>}

      <dl className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map(([k, v]) => (
          <div key={k} className="rounded-slip border border-brass-300 bg-slip p-4">
            <dt className="text-ink-soft">{k}</dt>
            <dd className="mt-1 text-money font-bold text-ink tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>

      {report && (report.sales.length === 0
        ? <p className="mt-6 text-ink-muted"><Bi k="noSales" /></p>
        : (
          <div className="mt-6 overflow-x-auto rounded-slip border border-brass-300 bg-slip">
            <table className="w-full text-left">
              <thead className="border-b border-brass-300 text-ink-soft">
                <tr>
                  <th className="p-3 font-semibold">{th("receiptNo")}</th>
                  <th className="p-3 font-semibold"><Bi k="time" /></th>
                  <th className="p-3 font-semibold"><Bi k="cashier" /></th>
                  <th className="p-3 font-semibold"><Bi k="paymentMethod" /></th>
                  <th className="p-3 text-right font-semibold">{th("pieces")}</th>
                  <th className="p-3 text-right font-semibold"><Bi k="total" /></th>
                </tr>
              </thead>
              <tbody>
                {report.sales.map((sale) => (
                  <tr key={sale.id} className="border-b border-brass-100 last:border-0 hover:bg-paper">
                    <td className="p-3"><Link to={`/payment/thankyou/${sale.id}`} className="font-semibold text-brass-800 underline-offset-2 hover:underline">{receiptNo(sale.id)}</Link></td>
                    <td className="p-3 tabular-nums">{new Date(sale.createdAt).toLocaleString()}</td>
                    <td className="p-3">{sale.cashierName}</td>
                    <td className="p-3">{th(sale.payment === "Cash" ? "cash" : "promptpay")}</td>
                    <td className="p-3 text-right tabular-nums">{sale.pieces}</td>
                    <td className="p-3 text-right tabular-nums font-semibold">{thb(sale.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
    </main>
  );
}
