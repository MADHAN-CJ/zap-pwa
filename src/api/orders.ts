import { apiRequest } from "./client";

export type Draft = {
  id: string;
  source: string;
  side: "BUY" | "SELL";
  symbol: string;
  securityId: string | null;
  exchangeSegment: string | null;
  productType: string;
  orderType: string;
  validity: string;
  quantity: number;
  price: number | null;
  triggerPrice: number | null;
  status: string;
  dhanOrderId: string | null;
  dhanStatus: string | null;
  createdAt: string;
};

export type PlaceDraftInput = {
  side: "BUY" | "SELL";
  symbol: string;
  quantity: number;
  productType?: string;
  orderType?: string;
  validity?: string;
  price?: number;
};

// Drafts an order (DRAFT queue). Never reaches the market — confirm in-app.
export const placeDraft = (body: PlaceDraftInput) =>
  apiRequest<{ success: boolean; draft: Draft }>("/orders/place", { method: "POST", body });

export const listDrafts = (status = "DRAFT") =>
  apiRequest<{ success: boolean; drafts: Draft[] }>(`/orders?status=${encodeURIComponent(status)}`);
