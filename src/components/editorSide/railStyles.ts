/** Class strings shared across the editor rail (kept out of component files so fast refresh stays whole). */
export const railInput = "h-11 rounded-slip border border-brass-300 bg-slip px-3 font-semibold text-ink focus:border-brass-700 focus:outline-none";

/** A selectable row in the editor rail (category filter); brass tint when active. */
export const railRow = (active: boolean) =>
  `flex w-full min-w-0 shrink-0 items-center gap-3 rounded-slip px-3 py-2.5 text-left ${active ? "bg-brass-100 font-semibold text-brass-800" : "text-ink hover:bg-paper"}`;
