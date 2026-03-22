import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { Item } from '../../types/Item';

type TaskFormProps = {
  isOpen: boolean;
  goldPrice: number | null;
  onClose: () => void;
  onAdd: (item: Omit<Item, 'id'>) => void;
};

function TaskForm({ isOpen, goldPrice, onClose, onAdd }: TaskFormProps) {
  const [weight, setWeight] = useState('');
  // Store the purity ratio as a number (e.g., 1 for 24k, 0.75 for 18k)
  const [purity, setPurity] = useState(1);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Check if goldPrice exists before calculating
    if (goldPrice === null) {
      alert("Market price is currently unavailable. Please try again later.");
      return;
    }

    const numWeight = parseFloat(weight);

    if (!numWeight || numWeight <= 0) {
      alert("Please enter a valid weight!");
      return;
    }
    const calculatedPrice = numWeight * purity * goldPrice;

    onAdd({
      weight: numWeight,
      goldPrice: goldPrice,
      price: calculatedPrice,
      date: new Date().toLocaleDateString('th-TH'),
      quantity: 1
    });

    setWeight('');
    onClose();
  };

  return createPortal(
    /* Added onClick to onClose to close when clicking the backdrop */
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-2xl p-8"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the white box
      >
        <h2 className="text-2xl font-black mb-6 uppercase text-gray-800">Add Gold Item</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Gold Weight (G)</label>
            <input
              type="number"
              step="0.01" // Allows decimals for precise gold weight
              placeholder='e.g. 15.2'
              className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-blue-400"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Purity</label>
            <select
              className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none bg-white"
              value={purity}
              onChange={(e) => setPurity(Number(e.target.value))}
            >
              <option value={24 / 24}>24 Karat (.999+ pure)</option>
              <option value={23 / 24}>23 Karat</option>
              <option value={22 / 24}>22 Karat</option>
              <option value={18 / 24}>18 Karat (75%)</option>
              <option value={14 / 24}>14 Karat</option>
              <option value={9 / 24}>9 Karat</option>
            </select>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 font-bold text-gray-500 hover:bg-gray-100 rounded-xl border-2 border-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition-all"
            >
              Add to Bag
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default TaskForm;