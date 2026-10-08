import { useState } from "react";
import type { Category } from "../../types/types";
import { RailForm, SymbolInput } from "./railForm";
import { railInput } from "./railStyles";

type EditorSidebarCategoryProps = {
  category: Category;
  onConfirm: (category: Category) => void;
  onCancel: () => void;
  onDelete: () => void;
};

function EditorSidebarCategoryEdit({ category, onConfirm, onCancel, onDelete }: EditorSidebarCategoryProps) {
  const [symbol, setSymbol] = useState(category.symbol);
  const [name, setName] = useState(category.name);

  return (
    <RailForm title={`Edit ${category.name}`} onSubmit={() => onConfirm({ ...category, symbol, name })} onCancel={onCancel} onDelete={onDelete} canSubmit={Boolean(symbol && name.trim())}>
      <div className="flex items-center gap-2">
        <SymbolInput value={symbol} onChange={setSymbol} />
        <input type="text" aria-label="Category name" className={`${railInput} min-w-0 grow`} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </div>
    </RailForm>
  );
}

export default EditorSidebarCategoryEdit;
