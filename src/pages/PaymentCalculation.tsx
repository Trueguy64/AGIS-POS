import { getPromo } from '../api/promo';
import { useState, useEffect } from 'react';
import Receipt from "../components/PaymentCalculation/Receipt";
import ShoppingBag from "../components/PaymentCalculation/ShoppingBag"
import type { CartItem, Promo, RateLock } from '../types/types';
import { useNavigate } from 'react-router-dom';
import { useGoldRate } from '../contexts/GoldRateContext';
import { computeTotals, getCart, getPromos, newSaleKey, setCart, setLock, setPromos as persistPromos } from '../lib/checkout';

function PaymentCalculation() {
    const [cartItems, setCartItems] = useState<CartItem[]>(getCart);
    const [promos, setPromos] = useState<Promo[]>(getPromos);
    const [locking, setLocking] = useState<RateLock | null>(null);
    const navigate = useNavigate();
    const rate = useGoldRate();

    const { subtotal, discount, total } = computeTotals(cartItems, promos, rate?.thbPerGram ?? 0);

    // Lock: freeze the rate, strike the stamp on this receipt, then move to payment.
    // The saleKey is generated here (not at submit time) so a retried POST that already
    // succeeded server-side is recognised and the cashier is not double-charged.
    const handleLock = () => {
        if (!rate || locking) return;
        const lock: RateLock = {
            goldRate: rate.thbPerGram,
            lockedAt: new Date().toISOString(),
            saleKey: newSaleKey(),
        };
        setLock(lock);
        persistPromos(promos);
        setLocking(lock);
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.setTimeout(() => navigate('/payment/types'), reduced ? 0 : 420);
    };

    const handleDeletePromo = (id: string) => {
        setPromos(prev => { const next = prev.filter(p => p.id !== id); persistPromos(next); return next; });
    };

    const handleAddPromo = async (data: { code: string }) => {
        const promo = await getPromo(data);
        setPromos(prev => { const next = prev.some(p => p.id === promo.id) ? prev : [...prev, promo]; persistPromos(next); return next; });
    };

    const handleDeleteItem = (id: string) => {
        setCartItems(prev => prev.filter(cartItem => cartItem.item.id !== id));
    };

    const handleUpdateQuantity = (id: string, amount: number) => {
        setCartItems(prev => prev.map(cartItem =>
            cartItem.item.id === id
                ? { ...cartItem, quantity: Math.max(1, Math.min(cartItem.quantity + amount, cartItem.item.stock)) }
                : cartItem
        ));
    };

    useEffect(() => { setCart(cartItems); }, [cartItems]);

    return (
        <main className="flex min-h-screen flex-col gap-4 bg-paper p-4 md:flex-row md:p-6 lg:h-screen lg:gap-5 lg:overflow-hidden lg:p-8">
            <ShoppingBag
                cartItem={cartItems}
                onDelete={handleDeleteItem}
                onUpdateQuantity={handleUpdateQuantity} />
            <Receipt
                lines={cartItems}
                promos={promos}
                onAddPromo={handleAddPromo}
                onDeletePromo={handleDeletePromo}
                onLock={handleLock}
                subtotal={subtotal}
                discount={discount}
                total={total}
                goldRate={locking?.goldRate ?? rate?.thbPerGram ?? null}
                liveRate={rate}
                lockedAt={locking?.lockedAt}
                interactable />
        </main>
    )
}

export default PaymentCalculation;
