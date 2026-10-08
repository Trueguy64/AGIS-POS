import { useState, useEffect } from "react";
import NavBar from "../components/mainWeb/NavBar";
import Sidebar from "../components/mainWeb/SideBar";
import ItemsScroll from "../components/mainWeb/ItemsScroll";
import BuyItemOverlay from "../components/mainWeb/buyItemOverlay";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { getInventory } from "../api/item";
import { getAllCategories } from "../api/category";
import type { Category, Item, CartItem } from "../types/types";
import { getCart, setCart as persistCart } from "../lib/checkout";
import Bi from "../components/Bi";
import { both } from "../lib/i18n";

function ItemSelectionMenu() {
  // Open on counter screens; closed on phones, where it overlays the grid when toggled.
  const [isSidebarOpen, setSidebarOpen] = useState(() => window.matchMedia("(min-width: 768px)").matches);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [cart, setCart] = useState<CartItem[]>(() =>
    getCart().filter((c) => c && typeof c.quantity === "number" && c.item && typeof c.item.id === "string" && typeof c.item.weight === "number")
  );

  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [hasUncategorized, setHasUncategorized] = useState(false);

  useEffect(() => {
    getAllCategories()
      .then(setCategories)
      .catch((error) => console.error("Failed to fetch categories", error));
  }, []);

  // The URL is the source of truth: search and category filters drive a server-side
  // re-fetch, so the cashier never has the whole inventory in memory.
  useEffect(() => {
    let cancelled = false;
    const search = searchParams.get("search") ?? "";
    const categories = searchParams.get("categories")?.split(",").filter(Boolean) ?? [];
    // AbortController is the right knob, but the shared `request` wrapper has no hook
    // for it yet; on a fast cashier machine the worst case is one stale setState on
    // an in-flight filter change, so we just guard with the `cancelled` flag.
    getInventory({ search, categories })
      .then((data) => {
        if (cancelled) return;
        setItems(data.items);
        setHasUncategorized(data.hasUncategorized);
      })
      .catch((error) => { if (!cancelled) console.error("Failed to fetch inventory", error); });
    return () => { cancelled = true; };
  }, [searchParams]);

  // Snapshot the current filter for the sidebar (which can't read searchParams inside its own render path).
  const selectedCategories = searchParams.get("categories")?.split(",").filter(Boolean) ?? [];

  const navigate = useNavigate();

  const handleAddToCart = (id: string, quantity: number) => {
    if (!selectedItem) return;
    setCart((prevCart) => {
      const existing = prevCart.find((c) => c.item.id === id);
      const updated = existing
        ? prevCart.map((c) => (c.item.id === id ? { ...c, quantity: Math.min(c.quantity + quantity, c.item.stock) } : c))
        : [...prevCart, { item: selectedItem, quantity: Math.min(quantity, selectedItem.stock) }];
      persistCart(updated);
      return updated;
    });
    setSelectedItem(null);
  };

  const handleCategoryClick = (categoryName: string | null) => {
    setSearchParams((prev) => {
      if (categoryName === null) {
        prev.delete("categories");
      } else {
        const currentTags = prev.get("categories")?.split(",").filter(Boolean) || [];
        const next = currentTags.includes(categoryName) ? currentTags.filter((t) => t !== categoryName) : [...currentTags, categoryName];
        if (next.length > 0) prev.set("categories", next.join(","));
        else prev.delete("categories");
      }
      return prev;
    });
  };

  const bagCount = cart.reduce((n, c) => n + c.quantity, 0);

  return (
    <div className="flex h-screen flex-col bg-paper">
      <NavBar onHamburgerButtonClick={() => setSidebarOpen(!isSidebarOpen)} sidebarOpen={isSidebarOpen} />

      <div className="relative flex min-h-0 flex-1 flex-row overflow-hidden">
        <Sidebar
          isOpen={isSidebarOpen}
          categories={categories}
          selectedCategories={selectedCategories}
          hasUncategorized={hasUncategorized}
          onCategoryClick={handleCategoryClick}
        />
        {isSidebarOpen && (
          <button type="button" className="absolute inset-0 z-20 bg-ink/30 md:hidden" aria-label={both("closeCategories")} onClick={() => setSidebarOpen(false)} />
        )}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <ItemsScroll items={items} onItemClick={setSelectedItem} />

          {/* The checkout bar: its own row, so it never covers a price, and in thumb reach on a phone. */}
          <div className="flex shrink-0 justify-end border-t border-brass-300 bg-paper px-3 py-2 md:px-4">
            <button
              type="button"
              className="flex h-14 w-full items-center justify-center gap-3 rounded-slip bg-brass-700 px-5 font-bold text-slip hover:bg-brass-800 md:w-auto"
              onClick={() => navigate("/payment")}
            >
              <Bi k="checkout" thOnly />{bagCount > 0 && <span className="tabular-nums">· {bagCount}</span>}
              <span lang="en" className="font-normal opacity-80">Checkout</span>
              <ArrowRight size={22} />
            </button>
          </div>
        </div>
      </div>

      {selectedItem && (
        <BuyItemOverlay
          item={selectedItem}
          onCancelClick={() => setSelectedItem(null)}
          onAddToCart={handleAddToCart}
        />
      )}
    </div>
  );
}

export default ItemSelectionMenu;
