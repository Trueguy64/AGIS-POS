import { useState } from 'react';
import Receipt from "../components/PaymentCalculation/Receipt";
import ShoppingBag from "../components/PaymentCalculation/ShoppingBag";
import type { Item } from '../types/Item';

type GoldPrice = {
  goldPrice : number | null;
};

function PaymentCalculation({goldPrice}:GoldPrice) {
    const [items, setItems] = useState<Item[]>([]);


    // Logic for totals (accounting for quantity)
    const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalWeight = items.reduce((sum, item) => sum + ((item.weight || 0) * item.quantity), 0);

    const handleAddItem = (newItemData: Omit<Item, 'id'>) => {
        const newItem: Item = { ...newItemData, id: crypto.randomUUID() };
        setItems(prev => [...prev, newItem]);
    };

    const handleDelete = (id: string) => {
        setItems(prev => prev.filter(item => item.id !== id));
    };

    const handleUpdateQuantity = (id: string, amount: number) => {
        setItems(prev => prev.map(item => 
            item.id === id ? { ...item, quantity: Math.max(1, item.quantity + amount) } : item
        ));
    };

    return (
        <div className="flex min-h-screen bg-blue-50 overflow-hidden">
            <div className="flex flex-col md:flex-row w-full items-stretch justify-center p-6 lg:p-20 gap-5">
                <ShoppingBag 
                    items={items} 
                    goldPrice={goldPrice}
                    onAdd={handleAddItem} 
                    onDelete={handleDelete} 
                    onUpdateQuantity={handleUpdateQuantity} 
                />
                <Receipt totalPrice={totalPrice} totalWeight={totalWeight} />
            </div>
        </div>
    );
}

export default PaymentCalculation;