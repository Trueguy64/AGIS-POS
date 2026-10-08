import { useState, type ChangeEvent, type SubmitEvent } from "react";
import type { Category } from "../../types/types";
import type { ItemRegisterInput } from "../../schemas/itemSchemas";
import EditorOverlay from "./editorOverlay";
import GoldFields, { fieldInput, fieldLabel } from "./goldFields";
import ImageField from "./imageField";

type EditorItemAddOverLayProps = {
    onCancelClick: () => void;
    /** No id / updatedAt — the server creates both and returns the real row. */
    onSave: (item: ItemRegisterInput, image: File) => void;
    categories: Category[];
}

function EditorItemAddOverLay({ onCancelClick, onSave, categories }: EditorItemAddOverLayProps) {
    const [title, setName] = useState("");
    const [category, setCategory] = useState("");
    const [weight, setWeight] = useState("");
    const [purity, setPurity] = useState(0.965);
    const [laborFee, setLaborFee] = useState("");
    const [stock, setStock] = useState("");
    const [imagePreview, setImagePreview] = useState("");
    const [image, setImage] = useState<File>();

    const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file === undefined) return;
        setImage(file);
        const reader = new FileReader();
        reader.onload = () => { if (typeof reader.result === "string") setImagePreview(reader.result); };
        reader.readAsDataURL(file);
    };

    const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (image === undefined) return;
        // No id / updatedAt — the server creates both and returns the real row.
        onSave({
            title,
            categoryId: categories.find((c) => c.name === category)?.id,
            stock: Number(stock) || 0,
            weight: Number(weight),
            purity,
            laborFee: Number(laborFee) || 0,
        }, image);
    };

    const canSubmit = Boolean(title.trim() && imagePreview && Number(weight) > 0);

    return (
        <EditorOverlay title="New piece" onCancelClick={onCancelClick}>
            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-6">
                <label className="block">
                    <span className={fieldLabel}>Name</span>
                    <input value={title} onChange={(event) => setName(event.target.value)} type="text" className={fieldInput} placeholder="Classic Chain Necklace 1 Baht" required autoFocus />
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
                        <input value={stock} onChange={(event) => setStock(event.target.value.replace(/[^\d]/g, ""))} type="text" inputMode="numeric" className={`${fieldInput} tabular-nums`} placeholder="0" />
                    </label>
                </div>
                <GoldFields weight={weight} onWeight={setWeight} purity={purity} onPurity={setPurity} laborFee={laborFee} onLaborFee={setLaborFee} />
                <ImageField preview={imagePreview} onChange={handleImageChange} required />
                <button type="submit" disabled={!canSubmit} className="mt-auto h-12 rounded-slip bg-brass-700 font-bold text-slip hover:bg-brass-800 disabled:cursor-not-allowed disabled:opacity-50">
                    Save piece
                </button>
            </form>
        </EditorOverlay>
    );
}

export default EditorItemAddOverLay;
