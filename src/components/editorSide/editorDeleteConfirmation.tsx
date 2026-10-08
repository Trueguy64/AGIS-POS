import type { Item } from "../../types/types";
import Dialog from "../Dialog";

type EditorDeleteConfirmationProps = {
  item: Item;
  onCancel: () => void;
  onConfirm: (itemId: string) => void;
};

function EditorDeleteConfirmation({ item, onCancel, onConfirm }: EditorDeleteConfirmationProps) {
  return (
    <Dialog label="Delete this piece?" onClose={onCancel} size="sm" alert>
      <div className="flex flex-col gap-5 p-6">
        <div>
          <h2 className="text-display font-bold text-ink">Delete this piece?</h2>
          <p className="mt-2 text-ink-soft">
            <span className="font-semibold text-ink">{item.title || "This piece"}</span> will be removed from the catalog. There is no undo.
          </p>
        </div>
        <div className="flex gap-3">
          <button type="button" className="h-12 flex-1 rounded-slip border border-brass-300 font-semibold text-ink hover:bg-paper" onClick={onCancel} autoFocus>
            Keep it
          </button>
          <button type="button" className="h-12 flex-1 rounded-slip border border-stamp font-semibold text-stamp hover:bg-stamp-tint" onClick={() => onConfirm(item.id)}>
            Delete
          </button>
        </div>
      </div>
    </Dialog>
  );
}

export default EditorDeleteConfirmation;
