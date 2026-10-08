import { PURITIES } from "../../lib/gold";

type Props = {
    weight: string;
    onWeight: (v: string) => void;
    purity: number;
    onPurity: (v: number) => void;
    laborFee: string;
    onLaborFee: (v: string) => void;
};

export const fieldInput = "h-11 w-full rounded-slip border border-brass-300 bg-slip px-3 font-semibold text-ink focus:border-brass-700 focus:outline-none";
export const fieldLabel = "mb-1 block font-semibold text-ink-soft";

/** Weight / purity / labor-fee inputs shared by the add and edit item forms. */
export default function GoldFields({ weight, onWeight, purity, onPurity, laborFee, onLaborFee }: Props) {
    return (
        <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
                <span className={fieldLabel}>Weight (grams)</span>
                <input value={weight} onChange={(e) => onWeight(e.target.value.replace(/[^\d.]/g, ""))} type="text" inputMode="decimal" className={`${fieldInput} tabular-nums`} placeholder="15.244" required />
            </label>
            <label className="block">
                <span className={fieldLabel}>Purity</span>
                <select value={purity} onChange={(e) => onPurity(Number(e.target.value))} className={fieldInput}>
                    {PURITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    {!PURITIES.some((p) => p.value === purity) && <option value={purity}>{+(purity * 100).toFixed(2)}%</option>}
                </select>
            </label>
            <label className="block">
                <span className={fieldLabel}>Labor fee (฿)</span>
                <input value={laborFee} onChange={(e) => onLaborFee(e.target.value.replace(/[^\d]/g, ""))} type="text" inputMode="numeric" className={`${fieldInput} tabular-nums`} placeholder="0" />
            </label>
        </div>
    );
}
