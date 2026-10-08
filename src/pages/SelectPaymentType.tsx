import { useCallback, useState } from 'react';
import { Navigate } from 'react-router-dom';
import PaymentTypes from '../components/PaymentTypes';
import Receipt from '../components/PaymentCalculation/Receipt';
import type { RateLock } from '../types/types';
import { computeTotals, getCart, getLock, getPromos, setLock as persistLock } from '../lib/checkout';

/**
 * The sale is locked. Everything here is derived from what survived the refresh: the cart (localStorage),
 * the applied promos and the rate lock (sessionStorage). No totals ride in router state.
 */
function SelectPaymentType() {
    const [lock, setLockState] = useState<RateLock | null>(getLock);
    const lines = getCart();
    const promos = getPromos();

    // On a relock the caller supplies a full RateLock (including the new saleKey); we just persist it.
    // Generating the key here too would waste one UUID on every relock.
    const relock = useCallback((next: RateLock) => {
        persistLock(next);
        setLockState(next);
    }, []);

    if (!lock || lines.length === 0) return <Navigate to="/payment" replace />;

    const totals = computeTotals(lines, promos, lock.goldRate);

    return (
        <main className="flex min-h-screen flex-col gap-4 bg-paper p-4 md:flex-row md:items-start md:p-6 lg:gap-5 lg:p-8">
            <PaymentTypes lines={lines} promos={promos} lock={lock} totals={totals} onRelock={relock} />
            <Receipt lines={lines} promos={promos} subtotal={totals.subtotal} discount={totals.discount} total={totals.total} goldRate={lock.goldRate} lockedAt={lock.lockedAt} interactable={false} />
        </main>
    );
}

export default SelectPaymentType;
