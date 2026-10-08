import { X } from "lucide-react";
import type { Item } from "../../types/types";
import { useGoldRate } from "../../contexts/GoldRateContext";
import { describeGold, itemPrice, thb, thbPerGramText } from "../../lib/gold";
import { imageUrl } from "../../api/item";
import Dialog from "../Dialog";
import Bi from "../Bi";
import { both, th } from "../../lib/i18n";

type BuyItemOverlayProps = {
    item: Item;
    onCancelClick: () => void;
    onAddToCart: (id: string, quantity: number) => void;
};

function BuyItemOverlay({ item, onCancelClick, onAddToCart }: BuyItemOverlayProps) {
    const { id, title, stock, image, laborFee } = item;
    const rate = useGoldRate();
    const available = stock - (item.held ?? 0);
    const soldOut = available <= 0;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const quantity = Math.max(1, Math.min(available, parseInt(formData.get('quantity') as string) || 1));
        onAddToCart(id, quantity);
    };

    return (
        <Dialog label={title} onClose={onCancelClick} size="lg">
            <div className="grid min-h-0 overflow-y-auto md:grid-cols-2">
                <div className="flex items-center justify-center border-b border-brass-300 bg-paper-deep p-6 md:border-b-0 md:border-r">
                    <img src={imageUrl(image)} alt="" className="max-h-48 w-full object-contain md:max-h-72" />
                </div>

                <div className="flex flex-col p-5 md:p-6">
                    <div className="flex items-start justify-between gap-4">
                        <h2 className="text-display font-bold text-ink">{title}</h2>
                        <button type="button" className="-mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-slip text-ink-soft hover:bg-paper hover:text-stamp" onClick={onCancelClick} aria-label={both("close")}>
                            <X size={22} />
                        </button>
                    </div>

                    <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1">
                        <dt className="text-ink-soft"><Bi k="gold" /></dt>
                        <dd className="text-right font-semibold">{describeGold(item)}</dd>
                        <dt className="text-ink-soft"><Bi k="laborFee" /></dt>
                        <dd className="text-right font-semibold tabular-nums">{thb(laborFee)}</dd>
                        <dt className="text-ink-soft"><Bi k="stock" /></dt>
                        <dd className={`text-right font-semibold ${soldOut ? "text-stamp" : ""}`}>{soldOut ? th("soldOut") : stock}</dd>
                    </dl>

                    <div className="mt-5 border-t border-brass-300 pt-4">
                        <div className="text-display font-bold text-brass-800 tabular-nums">
                            {rate ? thb(itemPrice(item, rate.thbPerGram)) : <span lang="th" className="text-ink-muted">{th("rateLoading")}</span>}
                        </div>
                        {rate && <p className="text-ink-muted">{thbPerGramText(rate.thbPerGram)} {th("perGram")}</p>}
                    </div>

                    <form onSubmit={handleSubmit} className="mt-auto flex items-end gap-3 pt-6">
                        <label className="flex flex-col gap-1">
                            <span className="font-semibold text-ink-soft"><Bi k="quantity" /></span>
                            <input
                                type="number"
                                name="quantity"
                                min={soldOut ? 0 : 1}
                                max={available}
                                defaultValue={soldOut ? "0" : "1"}
                                disabled={soldOut}
                                className="h-12 w-24 rounded-slip border border-brass-300 bg-slip px-3 text-money font-semibold text-ink tabular-nums focus:border-brass-700 focus:outline-none disabled:opacity-50"
                                required
                                autoFocus
                            />
                        </label>
                        <button
                            type="submit"
                            disabled={soldOut || !rate}
                            className="h-12 flex-1 rounded-slip bg-brass-700 font-bold text-slip hover:bg-brass-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Bi k={soldOut ? "soldOut" : "addToBag"} thOnly /> <span lang="en" className="font-normal opacity-80">{soldOut ? "Sold out" : "Add to bag"}</span>
                        </button>
                    </form>
                </div>
            </div>
        </Dialog>
    );
}

export default BuyItemOverlay;
