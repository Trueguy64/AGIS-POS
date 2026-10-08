import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Props = {
  label: string;
  onClose: () => void;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
  alert?: boolean; // role="alertdialog" for confirmations
};

const widths = { sm: "sm:max-w-sm", md: "sm:max-w-md", lg: "sm:max-w-3xl" };
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * A slip on the ink scrim. Bottom sheet on phones, centred from 640px. Traps focus, closes on Escape,
 * and hands focus back to the control that opened it.
 */
export default function Dialog({ label, onClose, children, size = "md", alert = false }: Props) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const first = panel.current?.querySelector<HTMLElement>("[autofocus], " + FOCUSABLE);
    first?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); return; }
      if (e.key !== "Tab" || !panel.current) return;
      const nodes = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (nodes.length === 0) return;
      const firstNode = nodes[0], lastNode = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === firstNode) { e.preventDefault(); lastNode.focus(); }
      else if (!e.shiftKey && document.activeElement === lastNode) { e.preventDefault(); firstNode.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); opener?.focus?.(); };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/50 sm:items-center sm:p-4" onClick={onClose} role="presentation">
      <div
        ref={panel}
        role={alert ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
        className={`flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-slip border border-brass-300 bg-slip pb-[env(safe-area-inset-bottom)] sm:rounded-slip sm:pb-0 ${widths[size]}`}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
