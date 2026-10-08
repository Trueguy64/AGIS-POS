import type { Item } from "../types/types";
import type { ItemRegisterInput, ItemUpdateInput } from "../schemas/itemSchemas";
import { request } from "./client";

function toFormData(data: Record<string, unknown>, file?: File): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(data)) {
    if (key === "image" || key === "category" || value === undefined) continue;
    fd.append(key, value === null ? "" : String(value));
  }
  if (file) fd.append("image", file);
  return fd;
}

export type InventoryResult = { items: Item[]; hasUncategorized: boolean };

/** Build "/item/inventory?search=foo&categories=A,B" without sprinkling encodeURIComponent across callers. */
function inventoryQuery({ search, categories }: { search?: string; categories?: string[] }): string {
  const parts: string[] = [];
  if (search) parts.push(`search=${encodeURIComponent(search)}`);
  if (categories && categories.length) parts.push(`categories=${encodeURIComponent(categories.join(","))}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

export const getInventory = (params: { search?: string; categories?: string[] } = {}) =>
  request<InventoryResult>("GET", `/item/inventory${inventoryQuery(params)}`);
export const registerItem = (data: ItemRegisterInput, image: File) =>
  request<Item>("POST", "/item/new", toFormData(data as Record<string, unknown>, image));
export const updateItem = (id: string, data: ItemUpdateInput, image?: File) =>
  request<Item>("PATCH", `/item/update/${id}`, toFormData(data as Record<string, unknown>, image));
export const deleteItem = (id: string) => request<void>("DELETE", `/item/delete/${id}`);

/** Resolve a stored image path ("uploads/x.png") to a URL served through the Vite /uploads proxy. */
export const imageUrl = (image: string) => (image.startsWith("http") ? image : `/${image.replace(/^\//, "")}`);
