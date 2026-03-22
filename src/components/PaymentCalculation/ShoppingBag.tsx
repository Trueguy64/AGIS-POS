import { useState } from 'react';
import PaymentItem from "./PaymentItem";
import TaskForm from "./AddItem";
import type { Item } from '../../types/Item';

type ShoppingBagProps = {
    items: Item[];
    goldPrice : number | null;
    onAdd: (item: Omit<Item, 'id'>) => void;
    onDelete: (id: string) => void;
    onUpdateQuantity: (id: string, amount: number) => void;
};

function ShoppingBag({ items, goldPrice, onAdd, onDelete, onUpdateQuantity }: ShoppingBagProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <div className="bg-white w-full h-full flex-2 p-4 border-4 border-gray-300 rounded-3xl">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl md:text-5xl font-black uppercase text-gray-900">Your Shopping Bag</h1>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="w-12 h-12 text-3xl bg-green-100 text-green-700 rounded-xl font-black hover:bg-green-200 transition-all"
                >
                    +
                </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-4">
                {items.length === 0 ? (
                    <div className="flex justify-center items-center">
                        <p className="text-center text-gray-400">Your bag is empty.</p>
                    </div>
                ) : (
                    items.map((item) => (
                        <PaymentItem 
                            key={item.id} 
                            item={item} 
                            onDelete={onDelete} 
                            onUpdateQuantity={onUpdateQuantity}
                        />
                    ))
                )}
            </div>

            <TaskForm 
                isOpen={isModalOpen}
                goldPrice={goldPrice} 
                onClose={() => setIsModalOpen(false)} 
                onAdd={(item) => { onAdd(item); setIsModalOpen(false); }} 
            />
        </div>
    );
}

export default ShoppingBag;