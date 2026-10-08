import type { GoldRate } from "../types/types";
import { request } from "./client";

export const getGoldRate = () => request<GoldRate>("GET", "/gold");
