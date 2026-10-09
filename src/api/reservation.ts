import type { PaymentOption, Sale } from "../types/types";
import { request } from "./client";

export type QuoteCard = {
  quoteId: string;
  itemId: string;
  title: string;
  priceTHB: number;
  depositTHB: number;
  currency: string;
  depositAmount: string;
  expiresAt: string;
};

export type ChatResponse = {
  reply: string;
  quote?: QuoteCard;
  reservation?: { reservationId: string; ref: string; paypalOrderId: string; currency: string };
};

export type ReservationStatus =
  | "PENDING"
  | "CAPTURING"
  | "PAID"
  | "REVIEW"
  | "COLLECTED"
  | "EXPIRED"
  | "CANCELLED";

export const chat = (
  messages: { role: "user" | "assistant"; content: string }[],
  activeQuoteId?: string,
) =>
  request<ChatResponse>("POST", "/agent/chat", { messages, activeQuoteId });

export const getPayConfig = () =>
  request<{ paypalClientId: string; currency: string }>("GET", "/reservation/config");

export const capture = (id: string) =>
  request<{ id: string; status: ReservationStatus }>("POST", `/reservation/${id}/capture`);

export type StaffReservation = {
  id: string;
  ref: string;
  status: ReservationStatus;
  customerName: string;
  contact: string;
  itemId: string;
  itemTitle: string;
  priceTHB: number;
  depositTHB: number;
  heldUntil: string;
  createdAt: string;
  captureStatus: string | null;
};

export const listReservations = () =>
  request<StaffReservation[]>("GET", "/reservation");

export const checkPayment = (id: string) =>
  request<{ id: string; status: ReservationStatus }>("POST", `/reservation/${id}/check`);

export const acceptReview = (id: string) =>
  request<{ id: string; status: ReservationStatus }>("POST", `/reservation/${id}/accept`);

export const cancelReview = (id: string) =>
  request<{ id: string; status: ReservationStatus }>("POST", `/reservation/${id}/cancel`);

export const collect = (
  reservationId: string,
  payment: PaymentOption,
  amountPaid: number,
) => request<Sale>("POST", "/sale/collect", { reservationId, payment, amountPaid });
