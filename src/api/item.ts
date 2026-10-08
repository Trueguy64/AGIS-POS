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

export const getInventory = () => request<Item[]>("GET", "/item/inventory");
export const registerItem = (data: ItemRegisterInput, image: File) =>
  request<Item>("POST", "/item/new", toFormData(data as Record<string, unknown>, image));
export const updateItem = (id: string, data: ItemUpdateInput, image?: File) =>
  request<Item>("PATCH", `/item/update/${id}`, toFormData(data as Record<string, unknown>, image));
export const deleteItem = (id: string) => request<void>("DELETE", `/item/delete/${id}`);

/** Resolve a stored image path ("uploads/x.png") to a URL served through the Vite /uploads proxy. */
export const imageUrl = (image: string) => (image.startsWith("http") ? image : `/${image.replace(/^\//, "")}`);
