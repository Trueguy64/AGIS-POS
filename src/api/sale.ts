import type { PaymentOption, Sale } from "../types/types";
import { request } from "./client";

export type SaleInput = {
  payment: PaymentOption;
  amountPaid: number;
  goldRate: number;
  lockedAt: string;
  promoCodes: string[];
  /** Client-generated UUID set when the rate lock was taken; sent as `Idempotency-Key`.
   *  The server returns the existing sale on a retry so a timed-out request that
   *  actually succeeded is not recorded twice. */
  saleKey: string;
  lines: { itemId: string; quantity: number }[];
};

/** Records the sale and decrements stock in one transaction; returns the saved sale with its receipt number. */
export const createSale = (data: SaleInput) => request<Sale>("POST", "/sale", data, { "Idempotency-Key": data.saleKey });
export const getSale = (id: string | number) => request<Sale>("GET", `/sale/${id}`);
