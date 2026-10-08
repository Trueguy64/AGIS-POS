import { Minus, Plus, Trash2 } from "lucide-react";
import type { CartItem } from "../../types/types";
import { useGoldRate } from "../../contexts/GoldRateContext";
import { describeGold, itemPrice, MONEY_COL, thb } from "../../lib/gold";
import { imageUrl } from "../../api/item";
import { both, th } from "../../lib/i18n";

type ItemProps = {
    cartItem: CartItem;
    onDelete: (id: string) => void;
    onUpdateQuantity: (id: string, amount: number) => void;
}

const stepButton = "flex h-11 w-11 items-center justify-center text-ink hover:bg-paper disabled:opacity-40 disabled:hover:bg-transparent";

function PaymentItem({ cartItem, onDelete, onUpdateQuantity }: ItemProps) {
    const { item, quantity } = cartItem;
    const rate = useGoldRate();
    const unit = rate ? itemPrice(item, rate.thbPerGram) : null;

    return (
        // Phone: thumb · text · trash on row one, stepper · total on row two. Counter: one row.
        <li className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-2 px-4 py-3 md:flex md:gap-4 md:px-5">
            <img className="h-12 w-12 shrink-0 rounded-slip border border-brass-300 object-cover" src={imageUrl(item.image)} alt="" />

            <div className="min-w-0 md:flex-1">
                <p className="line-clamp-2 font-semibold leading-snug text-ink md:truncate">{item.title}</p>
                <p className="flex flex-wrap gap-x-2 text-ink-soft">
                    <span className="whitespace-nowrap">{describeGold(item)}</span>
                    {unit !== null && <span className="whitespace-nowrap tabular-nums">{thb(unit)} {th("each")}</span>}
                </p>
            </div>

            <button type="button" onClick={() => onDelete(item.id)} className="flex h-11 w-11 items-center justify-center rounded-slip text-ink-muted hover:bg-stamp-tint hover:text-stamp md:order-last" aria-label={`${both("remove")}: ${item.title}`}>
                <Trash2 size={18} />
            </button>

            <div className="col-span-3 flex items-center justify-between md:contents">
                <div className="flex items-center overflow-hidden rounded-slip border border-brass-300" role="group" aria-label={`${both("quantity")}: ${item.title}`}>
                    <button type="button" onClick={() => onUpdateQuantity(item.id, -1)} disabled={quantity <= 1} className={stepButton} aria-label={both("oneFewer")}><Minus size={16} /></button>
                    <span className="w-8 text-center text-money font-semibold tabular-nums" aria-live="polite">{quantity}</span>
                    <button type="button" onClick={() => onUpdateQuantity(item.id, 1)} disabled={quantity >= item.stock} className={stepButton} aria-label={both("oneMore")}><Plus size={16} /></button>
                </div>
                <span className={`${MONEY_COL} text-money font-bold text-ink`}>{unit !== null ? thb(unit * quantity) : "—"}</span>
            </div>
        </li>
    );
}

export default PaymentItem;
