import { useCallback, useEffect, useState } from "react";
import Bi from "../components/Bi";
import CollectDialog from "../components/reservations/CollectDialog";
import { acceptReview, cancelReview, checkPayment, listReservations, type StaffReservation } from "../api/reservation";
import { thb } from "../lib/gold";
import { useAuth } from "../contexts/AuthContext";

export default function ReservationsPage() {
  const [rows, setRows] = useState<StaffReservation[]>([]);
  const [collecting, setCollecting] = useState<StaffReservation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const load = useCallback(() => listReservations().then(setRows).catch((e) => setError((e as Error).message)), []);
  useEffect(() => { load(); const t = setInterval(load, 15_000); return () => clearInterval(t); }, [load]);
  const act = (fn: (id: string) => Promise<unknown>, id: string) => fn(id).then(load).catch((e) => setError((e as Error).message));

  return (
    <main className="min-h-screen bg-paper p-4 md:p-6">
      <h1 className="mb-4 text-display font-bold text-ink"><Bi k="reservations" /></h1>
      {error && <p className="mb-3 text-stamp" role="alert">{error}</p>}
      <ul className="flex flex-col gap-2">
        {rows.map((r) => (
          <li key={r.id} className={`flex flex-wrap items-center gap-3 rounded-slip border bg-slip p-3 ${r.status === "CAPTURING" ? "border-stamp" : r.status === "REVIEW" ? "border-stamp bg-stamp-tint" : "border-brass-300"}`}>
            <span className="w-24 font-semibold">{r.status}</span>
            <span className="flex-1">{r.itemTitle} · {r.customerName} · {r.contact}</span>
            <span className="tabular-nums">{thb(r.priceTHB)} / {thb(r.depositTHB)}</span>
            <span className="text-ink-soft">{new Date(r.heldUntil).toLocaleString()}</span>
            {r.status === "CAPTURING" && <span className="text-stamp">Confirming with PayPal — press Check payment</span>}
            {r.status === "REVIEW" && <span className="text-stamp">Payment needs review in PayPal (capture status / amount does not match)</span>}
            {(r.status === "PENDING" || r.status === "CAPTURING") && <button type="button" onClick={() => act(checkPayment, r.id)} className="h-10 rounded-slip border border-brass-500 px-3"><Bi k="checkPayment" /></button>}
            {r.status === "PAID" && <button type="button" onClick={() => setCollecting(r)} className="h-10 rounded-slip bg-brass-700 px-3 text-slip"><Bi k="collect" /></button>}
            {r.status === "REVIEW" && user?.role === "Manager" && <>
              <button type="button" onClick={() => act(acceptReview, r.id)} className="h-10 rounded-slip border border-brass-500 px-3"><Bi k="acceptPaid" /></button>
              <button type="button" onClick={() => act(cancelReview, r.id)} className="h-10 rounded-slip border border-stamp px-3 text-stamp"><Bi k="cancelRefunded" /></button>
            </>}
          </li>
        ))}
      </ul>
      {collecting && <CollectDialog r={collecting} onClose={() => { setCollecting(null); load(); }} />}
    </main>
  );
}
