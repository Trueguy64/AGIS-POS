import type { Promo } from "../types/types";
import type { PromoEnterData, PromoRegisterData } from "../schemas/promoSchemas";
import { request } from "./client";

export const getAllPromo = () => request<Promo[]>("GET", "/promo/allpromo");
export const getPromo = (data: PromoEnterData) => request<Promo>("POST", "/promo/getpromo", data);
export const addPromo = (data: PromoRegisterData) => request<Promo>("POST", "/promo/newpromo", data);
export const updatePromo = (id: string, data: Partial<PromoRegisterData>) => request<Promo>("PATCH", `/promo/update/${id}`, data);
export const deletePromo = (id: string) => request<void>("DELETE", `/promo/delete/${id}`);
