import { type Item } from "../../types/types";
import { useGoldRate } from "../../contexts/GoldRateContext";
import { describeGold, itemPrice, thb } from "../../lib/gold";
import { imageUrl } from "../../api/item";
import { th } from "../../lib/i18n";

type ItemProps = {
  item: Item;
  onItemClick: () => void;
};

/** A slip card: photo well, title, Thai weight · grams · purity, and the live price in the money size. */
export default function ItemCard({ item, onItemClick }: ItemProps) {
  const { title, stock, image, category } = item;
  const rate = useGoldRate();
  const soldOut = stock <= 0;
  const price = rate ? thb(itemPrice(item, rate.thbPerGram)) : null;

  return (
    <button
      type="button"
      onClick={onItemClick}
      className="flex h-full w-full flex-col self-stretch overflow-hidden rounded-slip border border-brass-300 bg-slip text-left hover:border-brass-700 focus-visible:border-brass-700"
    >
      <div className="aspect-square w-full border-b border-brass-300 bg-paper-deep">
        <img
          src={imageUrl(image)}
          alt=""
          className={`h-full w-full object-cover ${soldOut ? "opacity-50 grayscale" : ""}`}
          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/uploads/placeholder.png"; }}
        />
      </div>

      <div className="flex w-full flex-1 flex-col p-3">
        <h3 className="line-clamp-2 min-h-[2.6em] font-semibold leading-snug text-ink">{title}</h3>
        <p className="truncate text-ink-soft" title={`${describeGold(item)}${category ? ` · ${category.name}` : ""}`}>
          {describeGold(item)}{category ? ` · ${category.name}` : ""}
        </p>
        <div className="mt-auto flex items-baseline justify-between gap-2 pt-2">
          {soldOut
            ? <span className="whitespace-nowrap font-semibold text-stamp" lang="th">{th("soldOut")}</span>
            : <span aria-hidden />}
          <span className="text-money font-bold text-brass-800 tabular-nums">{price ?? "—"}</span>
        </div>
      </div>
    </button>
  );
}
