/** Toggle `name` in the comma-separated ?categories= param (null clears it). Mutates and returns `prev` for setSearchParams. */
export function toggleCategory(prev: URLSearchParams, name: string | null) {
  const tags = prev.get("categories")?.split(",").filter(Boolean) ?? [];
  const next = name === null ? [] : tags.includes(name) ? tags.filter((t) => t !== name) : [...tags, name];
  if (next.length) prev.set("categories", next.join(","));
  else prev.delete("categories");
  return prev;
}
