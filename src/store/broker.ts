// Tiny global store for the "Reconnect Dhan" state. Dhan access tokens expire
// every 24 hours (api_key / access_token credentials have no refresh), so any
// 409 BROKER_TOKEN_EXPIRED (or a token_expired broker status) flips this on and
// the app shows a persistent reconnect banner. This is NOT a Zap-session
// problem — the 401 logout path must never fire for it (CLAUDE.md §10).

type Listener = (expired: boolean) => void;

let _expired = false;
const listeners = new Set<Listener>();

export function isBrokerExpired(): boolean {
  return _expired;
}

export function setBrokerExpired(expired: boolean) {
  if (_expired === expired) return;
  _expired = expired;
  listeners.forEach((l) => l(_expired));
}

export function subscribeBrokerExpired(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
