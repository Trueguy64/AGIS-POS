import { useState, type ChangeEvent, type SubmitEvent } from "react";
import type { Category, Item } from "../../types/types";
import EditorOverlay from "./editorOverlay";
import GoldFields, { fieldInput, fieldLabel } from "./goldFields";
import ImageField from "./imageField";
import { imageUrl } from "../../api/item";

type EditorItemEditOverLayProps = {
    item: Item;
    onCancelClick: () => void;
    onSave: (item: Omit<Item, 'image'>, image?: File) => void;
    categories: Category[];
}

function EditorItemEditOverLay({ item, onCancelClick, onSave, categories }: EditorItemEditOverLayProps) {
    const [title, setTitle] = useState(item.title);
    const [category, setCategory] = useState(item.category?.name ?? "");
    const [weight, setWeight] = useState(String(item.weight));
    const [purity, setPurity] = useState(item.purity);
    const [laborFee, setLaborFee] = useState(String(item.laborFee));
    const [stock, setStock] = useState(String(item.stock));
    const [imagePreview, setImagePreview] = useState(imageUrl(item.image));
    const [imageFile, setImageFile] = useState<File>();

    const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => { if (typeof reader.result === "string") setImagePreview(reader.result); };
        setImageFile(file);
        reader.readAsDataURL(file);
    };

    const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        onSave({
            ...item,
            title,
            categoryId: categories.find((c) => c.name === category)?.id || item.categoryId,
            weight: Number(weight),
            purity,
            laborFee: Number(laborFee) || 0,
            stock: Number(stock),
        }, imageFile);
    };

    return (
        <EditorOverlay title={`Edit ${item.title}`} onCancelClick={onCancelClick}>
            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-6">
                <label className="block">
                    <span className={fieldLabel}>Name</span>
                    <input value={title} onChange={(event) => setTitle(event.target.value)} type="text" className={fieldInput} required />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                        <span className={fieldLabel}>Category</span>
                        <input list="categories-list" value={category} onChange={(event) => setCategory(event.target.value)} type="text" className={fieldInput} placeholder="Necklaces" />
                        <datalist id="categories-list">
                            {categories.map(c => <option key={c.id} value={c.name} />)}
                        </datalist>
                    </label>
                    <label className="block">
                        <span className={fieldLabel}>Stock</span>
                        <input value={stock} onChange={(event) => setStock(event.target.value.replace(/[^\d]/g, ""))} type="text" inputMode="numeric" className={`${fieldInput} tabular-nums`} placeholder="0" required />
                    </label>
                </div>
                <GoldFields weight={weight} onWeight={setWeight} purity={purity} onPurity={setPurity} laborFee={laborFee} onLaborFee={setLaborFee} />
                <ImageField preview={imagePreview} onChange={handleImageChange} />
                <button type="submit" className="mt-auto h-12 rounded-slip bg-brass-700 font-bold text-slip hover:bg-brass-800">
                    Save changes
                </button>
            </form>
        </EditorOverlay>
    );
}

export default EditorItemEditOverLay;
