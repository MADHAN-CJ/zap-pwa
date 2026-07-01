import { apiRequest } from "./client";

export type BrokerStatus = {
  connected: boolean;
  broker: string;
  dhanClientId?: string;
  credentialType?: string;
  status?: string;
  ipStatus?: string;
  staticIp?: string | null;
  accessTokenExpiresAt?: string | null;
  lastError?: string | null;
};

export type Holding = {
  tradingSymbol: string;
  securityId: string;
  totalQty: number;
  availableQty: number;
  avgCostPrice: number;
};

export type Position = {
  tradingSymbol: string;
  securityId: string;
  exchangeSegment: string;
  productType: string;
  netQty: number;
  positionType: string;
  unrealizedProfit: number;
  realizedProfit: number;
};

export type Funds = {
  availabelBalance: number;
  withdrawableBalance: number;
  utilizedAmount: number;
  collateralAmount: number;
};

export const getStatus = () =>
  apiRequest<{ success: boolean; connection: BrokerStatus }>("/broker/status");

export const getStaticIp = () =>
  apiRequest<{ success: boolean; staticIp: string | null; note: string }>("/broker/static-ip");

// access_token / totp connect (api_key uses the consent endpoints below)
export const connect = (body: {
  dhanClientId: string;
  credentialType: "access_token" | "totp";
  accessToken?: string;
  pin?: string;
  totpSecret?: string;
}) =>
  apiRequest<{ success: boolean; connection: BrokerStatus }>("/broker/dhan/connect", {
    method: "POST",
    body,
  });

export const consentStart = (body: { apiKey: string; apiSecret: string; dhanClientId: string }) =>
  apiRequest<{ success: boolean; loginUrl: string; consentAppId: string }>(
    "/broker/dhan/consent/start",
    { method: "POST", body }
  );

export const consentComplete = (tokenId: string) =>
  apiRequest<{ success: boolean; connection: BrokerStatus }>("/broker/dhan/consent/complete", {
    method: "POST",
    body: { tokenId },
  });

export const disconnect = () =>
  apiRequest<{ success: boolean }>("/broker/disconnect", { method: "POST", body: {} });

export const getHoldings = () =>
  apiRequest<{ success: boolean; holdings: Holding[] }>("/broker/holdings");

export const getPositions = () =>
  apiRequest<{ success: boolean; positions: Position[] }>("/broker/positions");

export const getFunds = () =>
  apiRequest<{ success: boolean; funds: Funds }>("/broker/funds");
