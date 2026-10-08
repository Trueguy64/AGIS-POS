import type { ChangeEvent } from "react";
import { ImagePlus } from "lucide-react";
import { fieldLabel } from "./goldFields";

type Props = {
    preview: string;
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
    required?: boolean;
};

/** Photo picker for a piece: the preview sits in the same deep-paper well the catalog uses. */
export default function ImageField({ preview, onChange, required = false }: Props) {
    return (
        <div>
            <span className={fieldLabel}>Photo</span>
            <label className="flex cursor-pointer items-center gap-4 rounded-slip border border-brass-300 bg-slip p-3 hover:border-brass-700">
                <span className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-slip bg-paper-deep text-ink-muted">
                    {preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : <ImagePlus size={28} />}
                </span>
                <span className="min-w-0">
                    <span className="block font-semibold text-ink">{preview ? "Change photo" : "Choose a photo"}</span>
                    <span className="block text-ink-soft">JPEG, PNG or WEBP, up to 5 MB.</span>
                </span>
                <input onChange={onChange} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" required={required} />
            </label>
        </div>
    );
}
