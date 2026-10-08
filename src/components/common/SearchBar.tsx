import { Search, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { getAllCategories } from '../../api/category';
import { both, th } from '../../lib/i18n';

// The URL is the source of truth: ?search=foo&categories=A,B. Back button and bookmarks just work.
function SearchBar() {
    const [searchParams, setSearchParams] = useSearchParams();
    const urlSearch = searchParams.get("search") || "";
    const tags = searchParams.get("categories")?.split(",").filter(Boolean) ?? [];

    // Text being typed; null means "not editing, mirror the URL".
    const [draft, setDraft] = useState<string | null>(null);
    const query = draft ?? urlSearch;

    const [allCategories, setAllCategories] = useState<string[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [active, setActive] = useState(-1); // keyboard-highlighted suggestion
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        getAllCategories()
            .then((rows) => setAllCategories(rows.map((c) => c.name)))
            .catch((err) => console.error("Failed to load category list:", err));
    }, []);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setIsOpen(false);
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const dropdownItems = allCategories.filter(
        (c) => c.toLowerCase().startsWith(query.toLowerCase()) && !tags.includes(c)
    );

    function setTags(next: string[]) {
        setSearchParams((prev) => {
            if (next.length > 0) prev.set("categories", next.join(","));
            else prev.delete("categories");
            prev.set("page", "1");
            return prev;
        });
    }

    function addTag(name: string) {
        setTags([...new Set([...tags, name])]);
        setDraft(null);
        setIsOpen(false);
        setActive(-1);
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (isOpen && active >= 0 && dropdownItems[active]) { addTag(dropdownItems[active]); return; }
        setSearchParams((prev) => {
            if (query) prev.set("search", query);
            else prev.delete("search");
            prev.set("page", "1");
            return prev;
        });
        setDraft(null);
        setIsOpen(false);
        inputRef.current?.blur();
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        const input = e.currentTarget;
        if (e.key === "ArrowDown" && dropdownItems.length) { e.preventDefault(); setIsOpen(true); setActive((a) => (a + 1) % dropdownItems.length); return; }
        if (e.key === "ArrowUp" && dropdownItems.length) { e.preventDefault(); setActive((a) => (a <= 0 ? dropdownItems.length - 1 : a - 1)); return; }
        if (e.key === "Escape") { setIsOpen(false); setActive(-1); return; }
        // Backspace with the caret at position 0 removes the last tag.
        if (e.key === "Backspace" && input.selectionStart === 0 && input.selectionEnd === 0 && tags.length > 0) {
            setTags(tags.slice(0, -1));
        }
    }

    const listId = "search-suggestions";

    return (
        <div ref={wrapperRef} className="relative flex h-full min-w-0 flex-1 text-ink">
            <form
                onSubmit={handleSubmit}
                role="search"
                className="flex h-full min-w-0 flex-1 overflow-hidden rounded-slip border border-brass-300 bg-slip focus-within:border-brass-700"
            >
                {tags.length > 0 && (
                    <div className="flex shrink-0 items-center gap-1 pl-2">
                        {tags.map((tag) => (
                            <button
                                type="button"
                                key={tag}
                                onClick={() => setTags(tags.filter((t) => t !== tag))}
                                className="group flex h-8 items-center gap-1 rounded-sm bg-brass-100 px-2 font-semibold text-brass-800 hover:bg-brass-300"
                                aria-label={`${th("remove")} ${tag === "none" ? th("uncategorized") : tag}`}
                            >
                                {tag === "none" ? th("uncategorized") : tag}
                                <X size={14} className="group-hover:text-stamp" />
                            </button>
                        ))}
                    </div>
                )}

                <input
                    ref={inputRef}
                    className="min-w-0 flex-1 bg-transparent px-3 text-ink focus:outline-none"
                    placeholder={tags.length ? "" : both("searchPieces")}
                    value={query}
                    onChange={(e) => { setDraft(e.target.value); setActive(-1); setIsOpen(true); }}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    aria-label={both("searchPieces")}
                    role="combobox"
                    aria-expanded={isOpen && dropdownItems.length > 0}
                    aria-controls={listId}
                    aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
                    autoComplete="off"
                />
                <button className="flex items-center bg-brass-100 px-4 text-brass-800 hover:bg-brass-300" type="submit" aria-label={both("searchPieces")}>
                    <Search size={20} />
                </button>
            </form>

            {isOpen && dropdownItems.length > 0 && (
                <ul id={listId} role="listbox" aria-label={both("filterByCategory")} className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-slip border border-brass-300 bg-slip">
                    <li className="px-4 py-2 text-ink-muted" aria-hidden>{th("filterByCategory")}</li>
                    {dropdownItems.map((name, i) => (
                        <li
                            key={name}
                            id={`${listId}-${i}`}
                            role="option"
                            aria-selected={i === active}
                            // onMouseDown, not onClick: onClick fires after the input blurs and the
                            // click-outside listener has already closed the dropdown.
                            onMouseDown={() => addTag(name)}
                            onMouseEnter={() => setActive(i)}
                            className={`cursor-pointer px-4 py-2 text-ink ${i === active ? "bg-brass-100" : "hover:bg-brass-100"}`}
                        >
                            {name}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default SearchBar;
