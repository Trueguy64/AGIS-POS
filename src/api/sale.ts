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

export type SalesReport = {
  from: string;
  to: string;
  sales: { id: number; createdAt: string; cashierName: string; payment: PaymentOption; pieces: number; subtotal: number; discount: number; depositPaid: number; total: number }[];
  summary: { count: number; pieces: number; subtotal: number; discount: number; depositPaid: number; total: number; cash: number; promptPay: number };
};

const range = (from: string, to: string) => `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
/** Sales in [from, to) — any signed-in staff. */
export const listSales = (from: string, to: string) => request<SalesReport>("GET", `/sale?${range(from, to)}`);
/** The PDF is managers-only on the server; a plain link carries the auth cookie. */
export const salesPdfUrl = (from: string, to: string) => `/api/sale/report.pdf?${range(from, to)}`;
