import { Pencil } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { railRow } from "./railStyles";

type EditorSidebarCategoryProps = {
  text: string;
  symbol: string;
  onEditClick: () => void;
};

function EditorSidebarCategory({ symbol, text, onEditClick }: EditorSidebarCategoryProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  const onCategoryClick = () => {
    setSearchParams((prev) => {
      const currentTags = prev.get("categories")?.split(",").filter(Boolean) || [];
      const next = currentTags.includes(text) ? currentTags.filter(t => t !== text) : [...currentTags, text];
      if (next.length > 0) prev.set("categories", next.join(","));
      else prev.delete("categories");
      prev.set("page", "1");
      return prev;
    });
  };

  const isSelected = searchParams.get("categories")?.split(",").includes(text) ?? false;

  return (
    <div className="flex items-center gap-1">
      <button type="button" className={`${railRow(isSelected)} flex-1`} onClick={onCategoryClick} aria-pressed={isSelected}>
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
