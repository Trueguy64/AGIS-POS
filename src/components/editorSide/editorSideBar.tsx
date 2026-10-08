import { Plus, LayoutGrid, Package, ArrowLeft } from "lucide-react";
import EditorSidebarCategory from "./editorSideBarCategory";
import EditorSidebarPromo from "./editorSideBarPromo";
import type { Category, Promo } from "../../types/types";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import EditorSidebarCategoryEdit from "./editorSideBarCategoryEdit";
import EditorSidebarCategoryAdd from "./editorSideBarCategoryAdd";
import EditorSidebarPromoAdd from "./editorSideBarPromoAdd";
import EditorSidebarPromoEdit from "./editorSideBarPromoEdit";
import EditorSwitchCategoryPromo from "./editorSwitchCategoryPromo";
import { railRow } from "./railStyles";

type SidebarProps = {
  isOpen: boolean;
  categoryArray: Category[] | undefined;
  promoArray: Promo[] | undefined;
  onAddCategory: (category: Omit<Category, "id">) => void;
  onUpdateCategory: (category: Category) => void;
  onDeleteCategory: (id: string) => void;
  onAddPromo: (promo: Omit<Promo, "id">) => void;
  onUpdatePromo: (promo: Promo) => void;
  onDeletePromo: (id: string) => void;
};

function EditorSidebar({ isOpen, categoryArray = [], promoArray = [], onAddCategory, onUpdateCategory, onDeleteCategory, onAddPromo, onUpdatePromo, onDeletePromo }: SidebarProps) {
  const [activeTab, setActiveTab] = useState<"categories" | "promotions">("categories");
  const [isCreateCategory, setCreateCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [isCreatePromo, setCreatePromo] = useState(false);
  const [editingPromo, setEditingPromo] = useState<string | null>(null);

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategories = searchParams.get("categories")?.split(",").filter(Boolean) || [];

  const handleCategoryClick = (categoryName: string | null) => {
    setSearchParams((prev) => {
      if (categoryName === null) {
        prev.delete("categories");
      } else {
        const currentTags = prev.get("categories")?.split(",") || [];
        if (currentTags.includes(categoryName)) {
          const nextTags = currentTags.filter(t => t !== categoryName);
          if (nextTags.length > 0) prev.set("categories", nextTags.join(","));
          else prev.delete("categories");
        } else {
          currentTags.push(categoryName);
          prev.set("categories", currentTags.join(","));
        }
      }
      prev.set("page", "1");
      return prev;
    });
  };

  const createRow = "flex h-11 w-full items-center justify-between rounded-slip border border-dashed border-brass-500 px-3 font-semibold text-brass-800 hover:bg-brass-100";

  return (
    <aside
      className={`absolute inset-y-0 left-0 z-30 flex h-full shrink-0 flex-col overflow-hidden border-r border-brass-300 bg-slip md:static ${isOpen ? "w-72" : "w-0 border-r-0"}`}
      aria-label="Categories and promotions"
    >
      <EditorSwitchCategoryPromo activeTab={activeTab} onChange={(tab) => {
        setActiveTab(tab);
        setCreateCategory(false);
        setEditingCategoryId(null);
        setCreatePromo(false);
        setEditingPromo(null);
      }} />

      {activeTab === "categories" && (
        <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 pb-2">
          <button type="button" className={createRow} onClick={() => setCreateCategory(true)}>
            New category <Plus size={18} />
          </button>
          {isCreateCategory && (
            <EditorSidebarCategoryAdd
              onCancel={() => setCreateCategory(false)}
              onConfirm={(newCategory) => { onAddCategory(newCategory); setCreateCategory(false); }}
            />
          )}

          <button type="button" className={railRow(selectedCategories.length === 0)} onClick={() => handleCategoryClick(null)}>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brass-700 text-slip"><LayoutGrid size={16} /></span>
            All pieces
          </button>
          <button type="button" className={railRow(selectedCategories.includes("none"))} onClick={() => handleCategoryClick("none")}>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-paper-deep text-ink-soft"><Package size={16} /></span>
            Uncategorized
          </button>

          {categoryArray.map((category) => (
            category.id === editingCategoryId ? (
              <EditorSidebarCategoryEdit
                key={category.id}
                category={category}
                onConfirm={(updatedCategory) => { onUpdateCategory(updatedCategory); setEditingCategoryId(null); }}
                onCancel={() => setEditingCategoryId(null)}
                onDelete={() => { onDeleteCategory(category.id); setEditingCategoryId(null); }}
              />
            ) : (
              <EditorSidebarCategory
                key={category.id}
                symbol={category.symbol}
                text={category.name}
                onEditClick={() => setEditingCategoryId(category.id)}
              />
            )
          ))}
        </div>
      )}

      {activeTab === "promotions" && (
        <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 pb-2">
          <button type="button" className={createRow} onClick={() => setCreatePromo(true)}>
            New promotion <Plus size={18} />
          </button>
          {isCreatePromo && (
            <EditorSidebarPromoAdd
              onCancel={() => setCreatePromo(false)}
              onConfirm={(newPromo) => { onAddPromo(newPromo); setCreatePromo(false); }}
            />
          )}
          {promoArray.length === 0 && !isCreatePromo && (
            <p className="px-3 py-4 text-ink-muted">No promotions yet. Create one to give a code to customers.</p>
          )}
          {promoArray.map((promo) => (
            promo.id === editingPromo ? (
              <EditorSidebarPromoEdit
                key={promo.id}
                promo={promo}
                onConfirm={(updatedPromo) => { onUpdatePromo(updatedPromo); setEditingPromo(null); }}
                onCancel={() => setEditingPromo(null)}
                onDelete={() => { onDeletePromo(promo.id); setEditingPromo(null); }}
              />
            ) : (
              <EditorSidebarPromo
                key={promo.id}
                code={promo.code}
                type={promo.type}
                discountAmount={promo.discountAmount}
                onEditClick={() => setEditingPromo(promo.id)}
              />
            )
          ))}
        </div>
      )}

      <div className="shrink-0 border-t border-brass-300 p-3">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-slip border border-brass-300 font-semibold text-ink hover:bg-paper"
        >
          <ArrowLeft size={18} />
          Back to the counter
        </button>
      </div>
    </aside>
  );
}

export default EditorSidebar;
