import { useEffect, useState } from "react";
import Dialog from "../Dialog";
import Bi from "../Bi";
import PromptPayQR from "../PromptQR/PromptQR";
import { getShop } from "../../api/shop";
import { collect, type StaffReservation } from "../../api/reservation";
import { thb } from "../../lib/gold";
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

  async function submit() {
    setBusy(true); setError(null);
    try {
      const sale = await collect(r.id, payment, payment === "Cash" ? Math.round(Number(cash)) : balance);
      navigate(`/payment/thankyou/${sale.id}`);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <Dialog label={`Collect ${r.itemTitle}`} onClose={onClose}>
      <dl className="grid grid-cols-2 gap-1 tabular-nums">
        <dt>{r.itemTitle}</dt><dd className="text-right">{thb(r.priceTHB)}</dd>
        <dt><Bi k="depositPaid" /></dt><dd className="text-right">−{thb(r.depositTHB)}</dd>
        <dt className="font-bold"><Bi k="balance" /></dt><dd className="text-right text-money font-bold">{thb(balance)}</dd>
      </dl>
      <div className="my-3 flex gap-2">
        {(["Cash", "PromptPay"] as const).map((p) => (
          <button key={p} type="button" aria-pressed={payment === p} onClick={() => setPayment(p)} className={`h-11 flex-1 rounded-slip border ${payment === p ? "border-brass-700 bg-brass-100" : "border-brass-300"}`}>{p}</button>
        ))}
      </div>
      {payment === "Cash"
        ? <input type="number" min={balance} value={cash} onChange={(e) => setCash(e.target.value)} className="h-11 w-full rounded-slip border border-brass-300 px-3 tabular-nums" aria-label="Cash received" />
        : promptPayId ? <PromptPayQR id={promptPayId} amount={balance} size={220} /> : <p className="text-stamp">No PromptPay ID configured.</p>}
      {error && <p className="mt-2 text-stamp" role="alert">{error}</p>}
      <button type="button" disabled={busy || (payment === "Cash" && Number(cash) < balance)} onClick={submit} className="mt-3 h-12 w-full rounded-slip bg-brass-700 font-semibold text-slip disabled:opacity-50"><Bi k="collect" /></button>
    </Dialog>
  );
}
