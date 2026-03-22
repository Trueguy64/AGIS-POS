import DeleteIcon from "../../assets/Delete.svg";
import type { Item } from '../../types/Item';

type ItemProps = {
    item: Item;
    onDelete: (id: string) => void;
    onUpdateQuantity: (id: string, amount: number) => void;
};

function PaymentItem({ item, onDelete, onUpdateQuantity }: ItemProps) {
    return (
        <div className="flex flex-col md:flex-row rounded-xl w-full p-4 border-2 gap-4 border-gray-400 mt-2">
            <div className="flex items-center justify-center bg-red-100 rounded-xl p-2">
                <button onClick={() => onDelete(item.id)} className="p-2 rounded-lg hover:bg-red-100 transition-colors">
                    <img src={DeleteIcon} alt="Delete" className="w-5 h-5" />
                </button>
            </div>
            <div className="flex flex-col">
                <h3 className="font-bold text-lg">{item.weight}G</h3>
                <p className="text-gray-500 text-sm">฿{item.price.toLocaleString()}/unit</p>
            </div>
            <div className="flex flex-row items-center md:ml-auto justify-around gap-6 p-2 border-2 border-gray-400 rounded-xl">
                <button onClick={() => onUpdateQuantity(item.id, -1)} className="w-8 h-8 font-bold cursor-pointer">-</button>
                <span className="font-bold w-4 text-center">{item.quantity}</span>
                <button onClick={() => onUpdateQuantity(item.id, 1)} className="w-8 h-8 font-bold cursor-pointer">+</button>
            </div>
        </div>
    );
}

export default PaymentItem;