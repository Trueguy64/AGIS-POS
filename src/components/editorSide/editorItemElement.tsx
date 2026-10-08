import { Trash2 } from "lucide-react";
import type { Item } from "../../types/types";
import { useGoldRate } from "../../contexts/GoldRateContext";
import { describeGold, itemPrice, thb } from "../../lib/gold";
import { imageUrl } from "../../api/item";
import Bi from "../Bi";

type EditorItemElementProps = {
  item: Item;
  onEditClick: () => void;
  onDeleteClick?: () => void;
};

/** One catalog piece as an editor row: photo, title, gold line, stock, live price, Edit and Delete. */
function EditorItemElement({ item, onEditClick, onDeleteClick }: EditorItemElementProps) {
  const { title, image, category, stock, laborFee } = item;
  const rate = useGoldRate();

  return (
    <li className="flex items-center gap-3 rounded-slip border border-brass-300 bg-slip p-3">
      <img
        src={imageUrl(image)}
        className="h-14 w-14 shrink-0 rounded-slip border border-brass-300 object-cover"
        alt=""
        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/uploads/placeholder.png"; }}
      />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 font-semibold leading-snug text-ink md:truncate">{title}</p>
        <p className="truncate text-ink-soft">
          {describeGold(item)}
          <span className="hidden md:inline"> · <Bi k="laborFee" thOnly /> {thb(laborFee)}{category ? ` · ${category.name}` : ""}</span>
        </p>
        {stock > 0
          ? <p className="text-ink-muted"><span className="tabular-nums">{stock}</span> <Bi k="stock" /></p>
          : <p className="font-semibold text-stamp"><Bi k="soldOut" /></p>}
        {(item.held ?? 0) > 0 && <p className="text-stamp tabular-nums">{item.held} <Bi k="held" /></p>}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <span className="font-bold text-brass-800 tabular-nums">{rate ? thb(itemPrice(item, rate.thbPerGram)) : "—"}</span>
        <div className="flex gap-2">
          {onDeleteClick && (
            <button type="button" className="flex h-11 w-11 items-center justify-center rounded-slip text-ink-muted hover:bg-stamp-tint hover:text-stamp" onClick={onDeleteClick} aria-label={`Delete ${title}`}>
              <Trash2 size={18} />
            </button>
          )}
          <button type="button" className="h-11 rounded-slip border border-brass-300 px-4 font-semibold text-ink hover:bg-paper" onClick={onEditClick}>
            Edit
          </button>
        </div>
      </div>
    </li>
  );
}

export default EditorItemElement;
