import { X } from "lucide-react";
import Dialog from "../Dialog";

type EditorOverlayProps = {
    title: string;
    onCancelClick: () => void;
    children?: React.ReactNode;
}

/** Editor dialog: a slip on the ink scrim with a display title and a close square. */
function EditorOverlay({ title, onCancelClick, children }: EditorOverlayProps) {
    return (
        <Dialog label={title} onClose={onCancelClick} size="lg">
            <div className="flex items-start justify-between gap-4 px-6 pb-2 pt-5">
                <h2 className="text-display font-bold text-ink">{title}</h2>
                <button type="button" className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-slip text-ink-soft hover:bg-paper hover:text-stamp" onClick={onCancelClick} aria-label="Close">
                    <X size={22} />
                </button>
            </div>
            {children}
        </Dialog>
    );
}

export default EditorOverlay
