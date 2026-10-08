import { request } from "./client";

export type Shop = { promptPayId: string | null };

/** Shop-level settings: the PromptPay account customers pay into, if one is configured. */
export const getShop = () => request<Shop>("GET", "/shop");
