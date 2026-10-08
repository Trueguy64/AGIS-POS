export type Role = "Manager" | "Employee";
export type PromoType = "PERCENT" | "VALUE";

export type Category = {
  id: string;
  name: string;
  symbol: string;
};

export type Item = {
  id: string;
  title: string;
  image: string;
  description?: string;
  categoryId?: string;
  category?: Category;
  stock: number;
  weight: number; // grams
  purity: number; // fraction of pure gold, e.g. 0.965
  laborFee: number; // THB per piece
  updatedAt: string;
};

export type GoldRate = {
  usdPerOunce: number;
  usdToThb: number;
  thbPerGram: number;
  updatedAt: string;
  stale: boolean; // set client-side when updatedAt is older than STALE_AFTER_MS at the last refresh
};

export type CartItem = {
  item: Item;
  quantity: number;
};

/** The rate frozen when the cashier pressed Lock; lives in sessionStorage until the sale is recorded. */
export type RateLock = {
  goldRate: number; // THB per gram of pure gold
  lockedAt: string; // ISO
  saleKey: string; // client-generated UUID; sent as Idempotency-Key on the sale POST
};

export type SaleLine = {
  id: number;
  itemId: string | null;
  title: string;
  weight: number;
  purity: number;
  laborFee: number;
  unitPrice: number;
  quantity: number;
};

export type Sale = {
  id: number;
  createdAt: string;
  cashierId: number;
  cashierName: string;
  payment: PaymentOption;
  amountPaid: number;
  change: number;
  goldRate: number;
  lockedAt: string;
  subtotal: number;
  discount: number;
  total: number;
  promoCodes: string; // comma-separated codes applied
  saleKey?: string; // echoed back from the server when persisted; absent on legacy rows
  lines: SaleLine[];
};

export type Promo = {
  id: string;
  code: string;
  discountAmount: number;
  type: PromoType;
};

export type PaymentOption = "Cash" | "PromptPay";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
}

export interface UserFormData {
  name: string;
  email: string;
  phone: string;
}
