import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import EditorNavBar from "../components/editorSide/editorNavBar";
import EditorSidebar from "../components/editorSide/editorSideBar";
import EditorItemAddOverLay from "../components/editorSide/editorItemAddOverlay";
import EditorItemEditOverLay from "../components/editorSide/editorItemEditOverlay";
import EditorDeleteConfirmation from "../components/editorSide/editorDeleteConfirmation";
import EditorItemScroll from "../components/editorSide/editorItemScroll";
import EditorPageSelector from "../components/editorSide/editorPageSelector";
import type { Category, Item, Promo } from "../types/types";
import { deleteItem, getInventory, registerItem, updateItem } from "../api/item";
import { addPromo, updatePromo, getAllPromo, deletePromo } from "../api/promo";
import { getAllCategories, createCategory, updateCategory, deleteCategory } from "../api/category";

const errMsg = (err: unknown) => (err instanceof Error ? err.message : String(err));

function EditorMenu() {
    const [searchParams, setSearchParams] = useSearchParams();
    const currentPage = Number(searchParams.get("page")) || 1;
    const currentRow = Number(searchParams.get("row")) || 25;
    const searchQuery = searchParams.get("search")?.toLowerCase() || "";
    const selectedCategories = searchParams.get("categories")?.split(",").filter(Boolean) || [];

    const [items, setItems] = useState<Item[]>();
    const [promos, setPromos] = useState<Promo[]>();
    const [categories, setCategories] = useState<Category[]>([]);
    const [, setHasUncategorized] = useState(false); // accepted by /item/inventory, unused in the editor (sidebar shows real rows only)

    const [isSidebarOpen, setSidebarOpen] = useState(() => window.matchMedia("(min-width: 768px)").matches);
    const [isEditorOverlayOpen, setEditingOverlayOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [deletingIndex, setDeletingIndex] = useState<number | null>(null);

    useEffect(() => {
        Promise.all([getInventory(), getAllPromo(), getAllCategories()])
            .then(([inv, promoData, categoryData]) => {
                setItems(inv.items);
                setHasUncategorized(inv.hasUncategorized);
                setPromos(promoData);
                setCategories(categoryData);
            })
            .catch((error) => console.error("Failed to load data", error));
    }, []);

    const filteredItems = items?.filter((item) => {
        const matchesCategory = selectedCategories.length === 0 ||
            (selectedCategories.includes("none") && !item.categoryId) ||
            (item.category && selectedCategories.includes(item.category.name));
        const matchesSearch = !searchQuery ||
            item.title.toLowerCase().includes(searchQuery) ||
            item.description?.toLowerCase().includes(searchQuery);
        return matchesCategory && matchesSearch;
    }) || [];

    const currentItems = filteredItems.slice((currentPage - 1) * currentRow, currentPage * currentRow);
    const totalPage = Math.ceil((filteredItems.length || 1) / currentRow);
    const globalIndexOf = (index: number) => {
        const i = items?.findIndex((it) => it.id === currentItems[index].id) ?? -1;
        return i === -1 ? null : i;
    };

    // Promos
    async function handleAddPromo(promo: Omit<Promo, "id">) {
        try {
            const created = await addPromo(promo);
            setPromos((prev) => [created, ...prev ?? []]);
        } catch (err) {
            alert("Failed to add promo: " + errMsg(err));
        }
    }

    async function handleUpdatePromo({ id, ...data }: Promo) {
        try {
            const saved = await updatePromo(id, data);
            setPromos((prev) => prev?.map((p) => (p.id === id ? saved : p)));
        } catch (err) {
            alert("Failed to update promo: " + errMsg(err));
        }
    }

    async function handleDeletePromo(id: string) {
        try {
            await deletePromo(id);
            setPromos((prev) => prev?.filter((p) => p.id !== id));
        } catch (err) {
            alert("Failed to delete promo: " + errMsg(err));
        }
    }

    // Categories
    async function handleAddCategory(input: Omit<Category, "id">) {
        try {
            const created = await createCategory(input);
            setCategories((prev) => [created, ...prev]);
        } catch (err) {
            alert("Failed to add category: " + errMsg(err));
        }
    }

    async function handleUpdateCategory(updated: Category) {
        try {
            const saved = await updateCategory(updated.id, { name: updated.name, symbol: updated.symbol });
            const old = categories.find((c) => c.id === saved.id);
            // Keep an active ?categories= filter pointing at the renamed category.
            if (old && old.name !== saved.name && selectedCategories.includes(old.name)) {
                setSearchParams((prev) => {
                    prev.set("categories", selectedCategories.map((n) => (n === old.name ? saved.name : n)).join(","));
                    return prev;
                });
            }
            setCategories((prev) => prev.map((c) => (c.id === saved.id ? saved : c)));
            setItems((prev) => prev?.map((item) => (item.categoryId === saved.id ? { ...item, category: saved } : item)));
        } catch (err) {
            alert("Failed to update category: " + errMsg(err));
        }
    }

    async function handleDeleteCategory(id: string) {
        try {
            await deleteCategory(id);
            setCategories((prev) => prev.filter((c) => c.id !== id));
        } catch (err) {
            alert("Failed to delete category: " + errMsg(err));
        }
    }

    // Items
    async function handleAddItem(item: Omit<Item, "image">, imageFile: File) {
        try {
            const created = await registerItem(item, imageFile);
            setItems((prev) => [created, ...prev ?? []]);
            setSearchParams({ page: '1' });
        } catch (err) {
            alert("Failed to add item: " + errMsg(err));
        }
    }

    async function handleUpdateItem({ id, ...item }: Omit<Item, "image">, imageFile?: File) {
        try {
            const saved = await updateItem(id, item, imageFile);
            setItems((prev) => prev?.map((i) => (i.id === id ? saved : i)));
            setEditingIndex(null);
        } catch (err) {
            alert("Failed to update item: " + errMsg(err));
        }
    }

    async function handleDeleteItem(itemId: string) {
        try {
            await deleteItem(itemId);
            setItems((prev) => prev?.filter((item) => item.id !== itemId));
            setDeletingIndex(null);
        } catch (err) {
            alert("Failed to delete item: " + errMsg(err));
        }
    }

    return (
        <div className="flex h-screen flex-col bg-paper">
            <EditorNavBar
                onHamburgerButtonClick={() => setSidebarOpen(!isSidebarOpen)}
                onCreateButtonClick={() => setEditingOverlayOpen(true)}
            />

            <div className="relative flex flex-1 flex-row overflow-hidden">
                {isSidebarOpen && (
                    <button type="button" className="absolute inset-0 z-20 bg-ink/30 md:hidden" aria-label="Close lists" onClick={() => setSidebarOpen(false)} />
                )}
                <EditorSidebar
                    isOpen={isSidebarOpen}
                    categoryArray={categories}
                    promoArray={promos}
                    onAddCategory={handleAddCategory}
                    onUpdateCategory={handleUpdateCategory}
                    onDeleteCategory={handleDeleteCategory}
                    onAddPromo={handleAddPromo}
                    onUpdatePromo={handleUpdatePromo}
                    onDeletePromo={handleDeletePromo}
                />
                <EditorItemScroll
                    itemDataArray={currentItems}
                    onEditItem={(index) => setEditingIndex(globalIndexOf(index))}
                    onDeleteItem={(index) => setDeletingIndex(globalIndexOf(index))}
                />
            </div>

            {isEditorOverlayOpen && (
                <EditorItemAddOverLay
                    categories={categories}
                    onCancelClick={() => setEditingOverlayOpen(false)}
                    onSave={(item, image) => { handleAddItem(item, image); setEditingOverlayOpen(false); }}
                />
            )}

            {editingIndex !== null && items !== undefined && (
                <EditorItemEditOverLay
                    item={items[editingIndex]}
                    categories={categories}
                    onCancelClick={() => setEditingIndex(null)}
                    onSave={handleUpdateItem}
                />
            )}

            {deletingIndex !== null && items !== undefined && (
                <EditorDeleteConfirmation
                    item={items[deletingIndex]}
                    onCancel={() => setDeletingIndex(null)}
                    onConfirm={handleDeleteItem}
                />
            )}

            <EditorPageSelector currentPage={currentPage} currentRow={currentRow} totalPage={totalPage} />
        </div>
    );
}

export default EditorMenu;
