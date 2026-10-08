import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import PaymentItem from "./PaymentItem"
import type { CartItem } from '../../types/types'
import Bi from "../Bi";
import { both, th } from "../../lib/i18n";

type ShoppingBagProps = {
    cartItem: CartItem[];
    onDelete: (id: string) => void;
    onUpdateQuantity: (id: string, amount: number) => void;
}

function ShoppingBag({ cartItem, onDelete, onUpdateQuantity }: ShoppingBagProps) {
    const navigate = useNavigate();
    const pieces = cartItem.reduce((n, c) => n + c.quantity, 0);

    return (
        <section className="flex min-h-0 w-full flex-[2] flex-col overflow-hidden rounded-slip border border-brass-300 bg-slip" aria-labelledby="bag-title">
            <header className="flex items-center gap-3 px-5 py-4">
                <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-slip border border-brass-300 text-ink hover:bg-paper"
                    aria-label={both("backToCatalog")}
                >
                    <ArrowLeft size={20} />
                </button>
                <h1 id="bag-title" className="whitespace-nowrap text-display font-bold text-ink"><Bi k="bag" stack /></h1>
                <span className="ml-auto whitespace-nowrap text-ink-muted tabular-nums">{pieces} {th("pieces")}</span>
            </header>

            <div className="flex-1 overflow-y-auto">
                {cartItem.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                        <p className="text-display font-bold text-ink"><Bi k="bagEmpty" stack className="items-center" /></p>
                        <p className="mt-2 text-ink-soft"><Bi k="bagEmptyHint" /></p>
                    </div>
                ) : (
                    <ul className="py-1">
                        {cartItem.map((cartItem) => (
                            <PaymentItem
                                key={cartItem.item.id}
                                cartItem={cartItem}
                                onDelete={onDelete}
                                onUpdateQuantity={onUpdateQuantity}
                            />
                        ))}
                    </ul>
                )}
            </div>
        </section>
    )
}
export default ShoppingBag
