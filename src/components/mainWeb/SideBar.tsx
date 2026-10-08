import { UserRound, PenTool, LayoutGrid, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Category } from "../../types/types";
import { useAuth } from "../../contexts/AuthContext";
import Bi from "../Bi";
import { both } from "../../lib/i18n";

type SidebarProps = {
  isOpen: boolean;
  categories: Category[];
  selectedCategories: string[];
  hasUncategorized: boolean;
  onCategoryClick: (name: string | null) => void;
};

const row = (active: boolean) =>
  `flex w-full items-center gap-3 px-4 py-3 text-left whitespace-nowrap ${active ? "bg-brass-100 font-semibold text-brass-800" : "text-ink hover:bg-paper"}`;

export default function Sidebar({ isOpen, categories, selectedCategories, hasUncategorized, onCategoryClick }: SidebarProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <aside
      id="category-rail"
      // `inert` keeps the collapsed rail's buttons out of the tab order and the accessibility tree.
      inert={!isOpen}
      className={`absolute inset-y-0 left-0 z-30 flex h-full shrink-0 flex-col overflow-hidden border-r border-brass-300 bg-slip md:static ${isOpen ? "w-64" : "w-0 border-r-0"}`}
      aria-label={both("filterByCategory")}
    >
      <nav className="flex flex-1 flex-col overflow-y-auto py-2">
        <button type="button" className={row(selectedCategories.length === 0)} onClick={() => onCategoryClick(null)} aria-pressed={selectedCategories.length === 0}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brass-700 text-slip"><LayoutGrid size={16} /></span>
          <Bi k="allPieces" />
        </button>
        {hasUncategorized && (
          <button type="button" className={row(selectedCategories.includes("none"))} onClick={() => onCategoryClick("none")} aria-pressed={selectedCategories.includes("none")}>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-paper-deep text-ink-soft"><Package size={16} /></span>
            <Bi k="uncategorized" />
          </button>
        )}
        {categories.map((category) => (
          <button type="button" key={category.id} className={row(selectedCategories.includes(category.name))} onClick={() => onCategoryClick(category.name)} aria-pressed={selectedCategories.includes(category.name)}>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brass-100 text-base" aria-hidden>{category.symbol || "•"}</span>
            <span className="truncate">{category.name}</span>
          </button>
        ))}
      </nav>

      {/* The cashier's own account; the store editor only for managers, and never louder than selling. */}
      <div className="flex shrink-0 flex-col gap-2 border-t border-brass-300 p-3">
        <button
          type="button"
          onClick={() => navigate("/settings")}
          className="flex h-11 w-full items-center gap-2 rounded-slip px-3 text-left text-ink hover:bg-paper"
          aria-label={`${user?.name ?? ""} · ${both("settings")}`}
        >
          <UserRound size={18} className="shrink-0 text-ink-muted" />
          <span className="min-w-0 flex-1 truncate font-semibold">{user?.name ?? both("settings")}</span>
        </button>
        {user?.role === "Manager" && (
          <button
            type="button"
            onClick={() => navigate('/editor')}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-slip border border-brass-300 font-semibold text-ink hover:bg-paper"
          >
            <PenTool size={18} />
            <Bi k="storeEditor" />
          </button>
        )}
      </div>
    </aside>
  );
}
