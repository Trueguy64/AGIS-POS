import ItemCard from "./itemCard";
import type { Item } from "../../types/types";
import Bi from "../Bi";

type ItemsScrollProps = {
    items: Item[];
    onItemClick: (item: Item) => void;
};

/** The catalog field: cards repack in whole cells at every width; no cropped or orphaned card. */
function ItemsScroll({ items, onItemClick }: ItemsScrollProps) {
    if (items.length === 0) {
        return (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                <span className="text-display font-bold text-ink"><Bi k="noMatch" stack className="items-center" /></span>
                <span className="mt-2 text-ink-soft"><Bi k="noMatchHint" /></span>
            </div>
        );
    }

    return (
        <div className="min-h-0 flex-1 overflow-y-auto p-3 md:p-4">
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] gap-3 md:grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] md:gap-4">
                {items.map((item) => (
                    <li key={item.id} className="flex">
                        <ItemCard item={item} onItemClick={() => onItemClick(item)} />
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default ItemsScroll;
