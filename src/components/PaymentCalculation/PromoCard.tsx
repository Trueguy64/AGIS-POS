import type { Promo } from "../../types/types";
import { thb } from "../../lib/gold";
import { both, th } from "../../lib/i18n";

interface Props {
    promo: Promo;
    onDelete: (id: string) => void;
}

export default function PromoCard({ promo, onDelete }: Props) {
    const value = promo.type === "PERCENT" ? `−${promo.discountAmount}%` : `−${thb(promo.discountAmount)}`;
    return (
        <li className="flex items-center justify-between rounded-slip border border-dashed border-brass-500 px-3 py-2">
            <span>
                <span className="font-bold text-ink">{promo.code}</span>
                <span className="text-ink-soft tabular-nums"> · {value}</span>
            </span>
            <button type="button" className="font-semibold text-stamp hover:underline" onClick={() => onDelete(promo.id)} aria-label={`${both("remove")} ${promo.code}`}>
                {th("remove")}
            </button>
        </li>
    )
}
