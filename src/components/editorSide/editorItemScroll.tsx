import EditorItemElement from "./editorItemElement"
import { type Item } from "../../types/types"

type editorItemScrollProps = {
    itemDataArray: Item[];
    onEditItem: (itemIndex: number) => void;
    onDeleteItem?: (itemIndex: number) => void;
}

function EditorItemScroll({ itemDataArray = [], onEditItem, onDeleteItem }: editorItemScrollProps) {
    if (itemDataArray.length === 0) {
        return (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                <span className="text-display font-bold text-ink">No pieces here</span>
                <span className="mt-1 text-ink-soft">Clear the filter, or add a piece with New piece in the bar.</span>
            </div>
        );
    }
    return (
        <div className="flex-1 overflow-y-auto p-3 md:p-4">
            <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {itemDataArray.map((item, index) => (
                    <EditorItemElement
                        key={item.id}
                        item={item}
                        onEditClick={() => onEditItem(index)}
                        onDeleteClick={onDeleteItem ? () => onDeleteItem(index) : undefined}
                    />
                ))}
            </ul>
        </div>
    );
}

export default EditorItemScroll
