// Web port of the Expo auth store. Token/user live in localStorage; a global
// 401 handler lets the API client bounce an expired session back to /login.

const TOKEN_KEY = "zap_token";
const USER_KEY = "zap_user";

export type AuthUser = { id: string; email: string };

let _authErrorHandler: (() => void) | null = null;
export function setAuthErrorHandler(handler: () => void) {
  _authErrorHandler = handler;
}
export function triggerAuthError() {
  _authErrorHandler?.();
}

export function saveAuth(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  try {
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
