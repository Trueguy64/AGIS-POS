import { Pencil } from "lucide-react";
import { railRow } from "./railStyles";

type EditorSidebarCategoryProps = {
  text: string;
  symbol: string;
  selected: boolean;
  onClick: () => void;
  onEditClick: () => void;
};

function EditorSidebarCategory({ symbol, text, selected, onClick, onEditClick }: EditorSidebarCategoryProps) {
  return (
    <div className="flex items-center gap-1">
      <button type="button" className={`${railRow(selected)} flex-1`} onClick={onClick} aria-pressed={selected}>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brass-100 text-base">{symbol || "•"}</span>
        <span className="truncate">{text}</span>
      </button>
      <button type="button" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-slip text-ink-muted hover:bg-paper hover:text-ink" onClick={onEditClick} aria-label={`Edit category ${text}`}>
        <Pencil size={18} />
      </button>
    </div>
  );
}

export default EditorSidebarCategory;
