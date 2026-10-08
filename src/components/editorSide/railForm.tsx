import type { ReactNode } from "react";
import { Check, Trash2, X } from "lucide-react";
import { railInput } from "./railStyles";

/** One-grapheme input for a category's emoji or letter. */
export function SymbolInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="text"
      placeholder="🪙"
      aria-label="Category symbol"
      className={`${railInput} w-11 shrink-0 px-0 text-center text-base`}
      value={value}
      onChange={(e) => {
        const val = e.target.value;
        if (val === "") return onChange("");
        const segments = Array.from(new Intl.Segmenter("en", { granularity: "grapheme" }).segment(val));
        if (segments.length === 1) onChange(val);
      }}
    />
  );
}

type RailFormProps = {
  title: string;
  children: ReactNode;
  canSubmit: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  onDelete?: () => void;
};

/** Inline add/edit slip inside the editor rail: tinted ground, one row of fields, confirm / cancel / delete. */
export function RailForm({ title, children, canSubmit, onSubmit, onCancel, onDelete }: RailFormProps) {
  return (
    <form
      className="flex flex-col gap-3 rounded-slip bg-brass-100 p-3"
      onSubmit={(e) => { e.preventDefault(); if (canSubmit) onSubmit(); }}
    >
      <p className="font-semibold text-brass-800">{title}</p>
      {children}
      <div className="flex items-center gap-2">
        {onDelete && (
          <button type="button" onClick={onDelete} className="flex h-11 items-center gap-1.5 rounded-slip border border-stamp px-3 font-semibold text-stamp hover:bg-stamp-tint">
            <Trash2 size={16} /> Delete
          </button>
        )}
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={onCancel} className="flex h-11 w-11 items-center justify-center rounded-slip border border-brass-300 bg-slip text-ink hover:bg-paper" aria-label="Cancel">
            <X size={18} />
          </button>
          <button type="submit" disabled={!canSubmit} className="flex h-11 w-11 items-center justify-center rounded-slip bg-brass-700 text-slip hover:bg-brass-800 disabled:cursor-not-allowed disabled:opacity-50" aria-label="Save">
            <Check size={18} />
          </button>
        </div>
      </div>
    </form>
  );
}
