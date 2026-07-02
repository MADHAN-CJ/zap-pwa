import { getToken, triggerAuthError } from "@/store/auth";

// API base URL from the build-time env (VITE_API_BASE_URL). Defaults to the
// same UAT backend the Expo app uses.
export const BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? "https://uat.revise.network/zap-api/v1/api";

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  token?: string;
};

export type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number; description?: string; code?: string };

export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { method = "GET", body, headers = {} } = options;
  const reqHeaders: Record<string, string> = { ...headers };
  if (body) reqHeaders["Content-Type"] = "application/json";

  // Auto-attach the stored token unless one was passed explicitly.
  const token = options.token ?? getToken();
  if (token) reqHeaders["Authorization"] = `Bearer ${token}`;

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers: reqHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      if (response.status === 401) triggerAuthError();
      return {
        ok: false,
        error: data?.message ?? data?.error ?? "Something went wrong",
        status: response.status,
        description: data?.description,
        code: data?.code,
      };
    }
    return { ok: true, data: data as T };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? "Network error", status: 0 };
  }
}
