import type { Category } from "../types/types";
import { request } from "./client";

export type CategoryInput = Omit<Category, "id">;

export const getAllCategories = () => request<Category[]>("GET", "/category/all");
export const createCategory = (data: CategoryInput) => request<Category>("POST", "/category/new", data);
export const updateCategory = (id: string, data: Partial<CategoryInput>) => request<Category>("PATCH", `/category/update/${id}`, data);
export const deleteCategory = (id: string) => request<void>("DELETE", `/category/delete/${id}`);
