import type { LoginFormData, RegisterFormData } from "../schemas/userSchemas";
import type { User, UserFormData } from "../types/types";
import { request } from "./client";

export const loginUser = (data: LoginFormData) => request<User>("POST", "/auth/login", data);
export const registerUser = (data: RegisterFormData) => request<User>("POST", "/auth/register", data);
export const logoutUser = () => request<void>("POST", "/auth/logout");
export const updateUser = (id: string, data: Partial<UserFormData>) => request<User>("PATCH", `/auth/update/${id}`, data);
