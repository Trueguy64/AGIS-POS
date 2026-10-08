import { useState } from "react";
import type { Promo, PromoType } from "../../types/types";
import { RailForm } from "./railForm";
import { PromoFields } from "./editorSideBarPromoAdd";

type EditorSidebarPromoEditProps = {
  promo: Promo;
  onConfirm: (promo: Promo) => void;
  onCancel: () => void;
  onDelete: () => void;
};

function EditorSidebarPromoEdit({ promo, onConfirm, onCancel, onDelete }: EditorSidebarPromoEditProps) {
  const [code, setCode] = useState(promo.code);
  const [type, setType] = useState<PromoType>(promo.type);
  const [amount, setAmount] = useState(String(promo.discountAmount));

  return (
    <RailForm
      title={`Edit ${promo.code}`}
      onSubmit={() => onConfirm({ ...promo, code, type, discountAmount: Number(amount) })}
      onCancel={onCancel}
      onDelete={onDelete}
      canSubmit={Boolean(code.trim()) && Number(amount) > 0}
    >
      <PromoFields code={code} type={type} amount={amount} onCode={setCode} onType={setType} onAmount={setAmount} />
    </RailForm>
  );
}

export default EditorSidebarPromoEdit;
