import { Pencil } from "lucide-react";
import type { PromoType } from "../../types/types";

type EditorSidebarPromoProps = {
  code: string;
  type: PromoType;
  discountAmount: number;
  onEditClick: () => void;
};

function EditorSidebarPromo({ code, type, discountAmount, onEditClick }: EditorSidebarPromoProps) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex min-w-0 flex-1 items-baseline justify-between gap-3 rounded-slip px-3 py-2.5">
        <span className="truncate font-semibold text-ink">{code}</span>
        <span className="shrink-0 text-ink-soft">{type === "PERCENT" ? `${discountAmount}% off` : `฿${discountAmount.toLocaleString()} off`}</span>
      </div>
      <button type="button" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-slip text-ink-muted hover:bg-paper hover:text-ink" onClick={onEditClick} aria-label={`Edit promotion ${code}`}>
        <Pencil size={18} />
      </button>
    </div>
  );
}

export default EditorSidebarPromo;
