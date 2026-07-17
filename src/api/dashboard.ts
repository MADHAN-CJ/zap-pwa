import { apiRequest } from "./client";
import { Draft } from "./orders";

// The human confirmation surface. These submit real orders to the market.
export const listPending = (status = "DRAFT") =>
  apiRequest<{ success: boolean; orders: Draft[] }>(
    `/dashboard/orders?status=${encodeURIComponent(status)}`
  );

export const confirmOrder = (id: string) =>
  apiRequest<{ success: boolean; order: Draft; message: string }>(
    `/dashboard/orders/${id}/confirm`,
    { method: "POST", body: {} }
  );

export const confirmAll = () =>
  apiRequest<{ success: boolean; total: number; confirmed: number; failed: number }>(
    "/dashboard/orders/confirm-all",
    { method: "POST", body: {} }
  );

export const deleteOrder = (id: string) =>
  apiRequest<{ success: boolean }>(`/dashboard/orders/${id}`, { method: "DELETE" });

// ── eDIS (CDSL sell authorization for DDPI-less Dhan accounts) ────────────
export const edisTpin = () =>
  apiRequest<{ success: boolean; sent: boolean }>("/dashboard/edis/tpin", {
    method: "POST",
    body: {},
  });

export const edisForm = (body: { isin: string; qty: number; exchange?: "NSE" | "BSE" }) =>
  apiRequest<{ success: boolean; edisFormHtml: string }>("/dashboard/edis/form", {
    method: "POST",
    body,
  });

export const edisStatus = (isin: string) =>
  apiRequest<{ success: boolean; isin: string; aprvdQty?: number; totalQty?: number; status?: string }>(
    `/dashboard/edis/status/${encodeURIComponent(isin)}`
  );

// Square off an open position — submits an opposite-side MARKET order.
export const closePosition = (body: {
  securityId: string;
  exchangeSegment: string;
  netQty: number;
  productType?: string;
  symbol?: string;
}) =>
  apiRequest<{ success: boolean; order: Draft; message: string }>(
    "/dashboard/positions/close",
    { method: "POST", body }
  );
