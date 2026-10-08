import { useState } from "react";
import type { Promo, PromoType } from "../../types/types";
import { RailForm } from "./railForm";
import { railInput } from "./railStyles";

type EditorSidebarPromoAddProps = {
  onConfirm: (promo: Omit<Promo, "id">) => void;
  onCancel: () => void;
};

export function PromoFields({ code, type, amount, onCode, onType, onAmount }: {
  code: string; type: PromoType; amount: string;
  onCode: (v: string) => void; onType: (v: PromoType) => void; onAmount: (v: string) => void;
}) {
  return (
    <>
      <input type="text" placeholder="Code, e.g. GOLD10" aria-label="Promo code" className={`${railInput} w-full uppercase`} value={code} onChange={(e) => onCode(e.target.value.toUpperCase())} autoFocus />
      <div className="flex gap-2">
        <select aria-label="Discount type" className={`${railInput} w-28 shrink-0`} value={type} onChange={(e) => onType(e.target.value as PromoType)}>
          <option value="PERCENT">% off</option>
          <option value="VALUE">฿ off</option>
        </select>
        <input type="text" inputMode="decimal" placeholder="Amount" aria-label="Discount amount" className={`${railInput} min-w-0 grow tabular-nums`} value={amount} onChange={(e) => onAmount(e.target.value.replace(/[^\d.]/g, ""))} />
      </div>
    </>
  );
}

function EditorSidebarPromoAdd({ onConfirm, onCancel }: EditorSidebarPromoAddProps) {
  const [code, setCode] = useState("");
  const [type, setType] = useState<PromoType>("PERCENT");
  const [amount, setAmount] = useState("");

  return (
    <RailForm
      title="New promotion"
      onSubmit={() => onConfirm({ code, type, discountAmount: Number(amount) })}
      onCancel={onCancel}
      canSubmit={Boolean(code.trim()) && Number(amount) > 0}
    >
      <PromoFields code={code} type={type} amount={amount} onCode={setCode} onType={setType} onAmount={setAmount} />
    </RailForm>
  );
}

export default EditorSidebarPromoAdd;
