import { useState } from "react";
import type { Category } from "../../types/types";
import { RailForm, SymbolInput } from "./railForm";
import { railInput } from "./railStyles";

type EditorSidebarCategoryAddProps = {
  onConfirm: (category: Omit<Category, "id">) => void;
  onCancel: () => void;
};

function EditorSidebarCategoryAdd({ onConfirm, onCancel }: EditorSidebarCategoryAddProps) {
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");

  return (
    <RailForm title="New category" onSubmit={() => onConfirm({ symbol, name })} onCancel={onCancel} canSubmit={Boolean(symbol && name.trim())}>
      <div className="flex items-center gap-2">
        <SymbolInput value={symbol} onChange={setSymbol} />
        <input type="text" placeholder="Category name" aria-label="Category name" className={`${railInput} min-w-0 grow`} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </div>
    </RailForm>
  );
}

export default EditorSidebarCategoryAdd;
