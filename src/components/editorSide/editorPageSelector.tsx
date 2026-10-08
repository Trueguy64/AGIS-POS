import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from "lucide-react";
import { useSearchParams } from "react-router-dom";

type editorPageSelectorProps = {
    currentPage?: number;
    totalPage?: number;
    currentRow?: number;
}

const navButton = "flex h-11 w-11 items-center justify-center text-ink hover:bg-paper disabled:opacity-40 disabled:hover:bg-transparent";

function EditorPageSelector({ currentPage = 1, currentRow = 25, totalPage = 1 }: editorPageSelectorProps) {
    const [, setSearchParams] = useSearchParams();

    const goTo = (page: number) => setSearchParams((prev) => { prev.set("page", String(page)); return prev; });
    const setRows = (row: number) => setSearchParams((prev) => { prev.set("row", String(row)); prev.set("page", "1"); return prev; });

    return (
        <div className="flex shrink-0 flex-col items-center justify-center gap-2 border-t border-brass-300 bg-slip px-4 py-3 text-ink sm:flex-row sm:gap-6">
            <label className="flex items-center gap-2">
                <span className="text-ink-soft">Rows per page</span>
                <select value={currentRow} onChange={(e) => setRows(Number(e.target.value))}
                    className="h-11 rounded-slip border border-brass-300 bg-slip px-3 font-semibold focus:border-brass-700 focus:outline-none">
                    {[25, 50, 75, 100].map((rows) => <option key={rows} value={rows}>{rows}</option>)}
                </select>
            </label>

            <div className="flex items-center gap-3">
                <span className="whitespace-nowrap">
                    Page <span className="font-semibold">{currentPage}</span> <span className="text-ink-soft">of {totalPage}</span>
                </span>
                <div className="flex items-center overflow-hidden rounded-slip border border-brass-300">
                    <button type="button" disabled={currentPage <= 1} onClick={() => goTo(1)} className={navButton} aria-label="First page"><ChevronFirst size={20} /></button>
                    <button type="button" disabled={currentPage <= 1} onClick={() => goTo(currentPage - 1)} className={navButton} aria-label="Previous page"><ChevronLeft size={20} /></button>
                    <button type="button" disabled={currentPage >= totalPage} onClick={() => goTo(currentPage + 1)} className={navButton} aria-label="Next page"><ChevronRight size={20} /></button>
                    <button type="button" disabled={currentPage >= totalPage} onClick={() => goTo(totalPage)} className={navButton} aria-label="Last page"><ChevronLast size={20} /></button>
                </div>
            </div>
        </div>
    );
}

export default EditorPageSelector;
