type Tab = "categories" | "promotions";

type EditorSwitchCategoryPromoProps = {
  activeTab: Tab;
  onChange: (tab: Tab) => void;
};

const tab = (active: boolean) =>
  `h-11 flex-1 rounded-slip font-semibold ${active ? "bg-brass-100 text-brass-800" : "text-ink hover:bg-paper"}`;

/** Two-way switch between the category list and the promo list in the editor rail. */
export default function EditorSwitchCategoryPromo({ activeTab, onChange }: EditorSwitchCategoryPromoProps) {
  return (
    <div className="flex gap-1 p-2" role="tablist" aria-label="Editor lists">
      <button type="button" role="tab" aria-selected={activeTab === "categories"} className={tab(activeTab === "categories")} onClick={() => onChange("categories")}>
        Categories
      </button>
      <button type="button" role="tab" aria-selected={activeTab === "promotions"} className={tab(activeTab === "promotions")} onClick={() => onChange("promotions")}>
        Promotions
      </button>
    </div>
  );
}
