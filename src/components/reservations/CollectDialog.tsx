import { useEffect, useState } from "react";
import { X } from "lucide-react";
import Dialog from "../Dialog";
import Bi from "../Bi";
import PromptPayQR from "../PromptQR/PromptQR";
import { getShop } from "../../api/shop";
import { collect, type StaffReservation } from "../../api/reservation";
import { MONEY_COL, thb } from "../../lib/gold";
import { both } from "../../lib/i18n";
import { useNavigate } from "react-router-dom";

export default function CollectDialog({ r, onClose }: { r: StaffReservation; onClose: () => void }) {
  const balance = r.priceTHB - r.depositTHB;
  const [payment, setPayment] = useState<"Cash" | "PromptPay">("Cash");
  const [cash, setCash] = useState(String(balance));
  const [promptPayId, setPromptPayId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  useEffect(() => { getShop().then((s) => setPromptPayId(s.promptPayId)).catch(() => setPromptPayId(null)); }, []);
  const given = Math.round(Number(cash));

  async function submit() {
    setBusy(true); setError(null);
    try {
      const sale = await collect(r.id, payment, payment === "Cash" ? given : balance);
      navigate(`/payment/thankyou/${sale.id}`);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <Dialog label={`${both("collect")} · ${r.ref}`} onClose={onClose}>
      <div className="flex min-h-0 flex-col gap-4 overflow-y-auto p-6">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-display font-bold text-ink"><Bi k="collect" stack /></h2>
            <p className="mt-1 text-ink-soft"><span className="font-semibold text-ink">{r.ref}</span> · {r.customerName}</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-slip text-ink hover:bg-paper hover:text-stamp" aria-label={both("close")}><X size={22} /></button>
        </header>

        <dl className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3"><dt className="min-w-0 font-semibold text-ink">{r.itemTitle}</dt><dd className={MONEY_COL}>{thb(r.priceTHB)}</dd></div>
          <div className="flex items-baseline justify-between gap-3"><dt className="text-ink-soft"><Bi k="depositPaid" /></dt><dd className={MONEY_COL}>−{thb(r.depositTHB)}</dd></div>
          <div className="flex items-end justify-between gap-3 border-t border-brass-300 pt-3"><dt className="text-display font-bold text-ink"><Bi k="balance" stack /></dt><dd className="text-display font-bold text-brass-800 tabular-nums">{thb(balance)}</dd></div>
        </dl>

        <div className="flex gap-2" role="group" aria-label={both("paymentMethod")}>
          {(["Cash", "PromptPay"] as const).map((p) => (
            <button key={p} type="button" aria-pressed={payment === p} onClick={() => setPayment(p)} className={`h-12 flex-1 rounded-slip border font-semibold ${payment === p ? "border-brass-700 bg-brass-100 text-brass-800" : "border-brass-300 text-ink hover:bg-paper"}`}>
              <Bi k={p === "Cash" ? "cash" : "promptpay"} />
            </button>
          ))}
        </div>

        {payment === "Cash" ? (
          <label className="flex flex-col gap-1">
            <span className="font-semibold text-ink-soft"><Bi k="cashGiven" /></span>
            <input type="number" inputMode="numeric" min={balance} value={cash} onChange={(e) => setCash(e.target.value)} className="h-14 w-full rounded-slip border border-brass-300 bg-slip px-3 text-display font-bold tabular-nums focus:border-brass-700 focus:outline-none" />
            {given > balance && <span className="flex justify-between text-ok"><Bi k="change" /><span className="text-money font-bold tabular-nums">{thb(given - balance)}</span></span>}
          </label>
        ) : promptPayId ? <PromptPayQR id={promptPayId} amount={balance} size={220} /> : <p className="rounded-slip bg-stamp-tint px-3 py-2 text-stamp">No PromptPay ID configured.</p>}

        {error && <p className="rounded-slip bg-stamp-tint px-3 py-2 text-stamp" role="alert">{error}</p>}
        <button type="button" disabled={busy || (payment === "Cash" && given < balance)} onClick={submit} aria-busy={busy} className="flex h-14 w-full items-center justify-center rounded-slip bg-brass-700 text-slip hover:bg-brass-800 disabled:cursor-not-allowed disabled:opacity-50">
          <Bi k="collect" stack className="items-center text-money font-bold" />
        </button>
      </div>
    </Dialog>
  );
}
