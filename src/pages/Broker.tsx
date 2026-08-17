import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IconExternalLink, IconRefresh } from "@tabler/icons-react";
import {
  BrokerStatus,
  connect,
  consentComplete,
  consentStart,
  disconnect,
  getStatus,
} from "@/api/broker";
import { clearAuth, getUser } from "@/store/auth";
import { setBrokerExpired } from "@/store/broker";
import { Spinner, useUI } from "@/components/ui";
import PageHeader from "@/components/PageHeader";
import { haptics } from "@/lib/haptics";

// Dhan connection. Two credential paths (both human-only on the API):
//   • access_token — paste the 24h token generated on Dhan's platform;
//   • api_key      — API key + secret → Dhan consent login in a new tab →
//                    paste the tokenId from the redirect URL to complete.
// Either way Zap stores the credential encrypted server-side; it never reaches
// the AI environment. Tokens expire daily → the "token_expired" state below.
type Mode = "access_token" | "api_key";

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div className="row-between" style={{ padding: "6px 0" }}>
      <span className="dim">{k}</span>
      <span style={{ fontWeight: 600, maxWidth: "60%", textAlign: "right", wordBreak: "break-all" }}>
        {v}
      </span>
    </div>
  );
}

const fmtExpiry = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";

const prettyCred = (t?: string) =>
  t === "access_token" ? "Access token" : t === "api_key" ? "API key" : t === "totp" ? "TOTP" : t || "—";

export default function Broker() {
  const navigate = useNavigate();
  const { toast, confirm } = useUI();
  const [status, setStatus] = useState<BrokerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<Mode>("access_token");

  const [dhanClientId, setDhanClientId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [tokenId, setTokenId] = useState("");
  const [consentStarted, setConsentStarted] = useState(false);

  const applyStatus = useCallback((s: BrokerStatus) => {
    setStatus(s);
    // Keep the global reconnect banner in sync with the source of truth.
    if (s.connected) setBrokerExpired(false);
    else if (s.status === "token_expired") setBrokerExpired(true);
    // Pre-fill the client id on reconnect so the user only re-enters the token.
    if (s.dhanClientId) setDhanClientId((v) => v || s.dhanClientId!);
  }, []);

  const load = useCallback(async () => {
    const res = await getStatus();
    if (res.ok) applyStatus(res.data.connection);
    setLoading(false);
  }, [applyStatus]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const doConnect = async () => {
    setBusy(true);
    const res = await connect({ dhanClientId, credentialType: "access_token", accessToken });
    setBusy(false);
    if (res.ok) {
      haptics.success();
      setAccessToken("");
      toast("success", "Connected", "Your Dhan account is linked.");
      applyStatus(res.data.connection);
      load();
    } else {
      haptics.error();
      toast("error", "Could not connect", res.description || res.error);
    }
  };

  const startConsent = async () => {
    setBusy(true);
    const res = await consentStart({ apiKey, apiSecret, dhanClientId });
    setBusy(false);
    if (res.ok) {
      setConsentStarted(true);
      window.open(res.data.loginUrl, "_blank", "noopener");
    } else toast("error", "Could not start consent", res.description || res.error);
  };

  const finishConsent = async () => {
    setBusy(true);
    const res = await consentComplete(tokenId.trim());
    setBusy(false);
    if (res.ok) {
      haptics.success();
      setConsentStarted(false);
      setTokenId("");
      toast("success", "Connected", "Your Dhan account is linked.");
      applyStatus(res.data.connection);
      load();
    } else {
      haptics.error();
      toast("error", "Could not complete", res.description || res.error);
    }
  };

  const doDisconnect = async () => {
    const ok = await confirm({
      title: "Disconnect",
      message: "Disconnect your Dhan account?",
      confirmText: "Disconnect",
      destructive: true,
    });
    if (!ok) return;
    await disconnect();
    setBrokerExpired(false);
    load();
  };

  const signOut = () => {
    clearAuth();
    navigate("/login", { replace: true });
  };

  const refreshBtn = (
    <button className="ph-action" onClick={load} aria-label="Refresh broker status">
      <IconRefresh size={17} stroke={2} />
    </button>
  );

  if (loading) {
    return (
      <div className="page">
        <PageHeader title="Broker" action={refreshBtn} />
        <div className="screen">
          <div className="card">
            <div className="skeleton" style={{ width: 100, height: 20, marginBottom: 18 }} />
            <div className="skeleton" style={{ width: "100%", height: 15, marginBottom: 12 }} />
            <div className="skeleton" style={{ width: "100%", height: 15, marginBottom: 12 }} />
            <div className="skeleton" style={{ width: "80%", height: 15, marginBottom: 20 }} />
            <div className="skeleton" style={{ width: "100%", height: 48, borderRadius: 12 }} />
          </div>
        </div>
      </div>
    );
  }

  const connected = status?.connected;
  const tokenExpired = status?.status === "token_expired";
  const user = getUser();

  return (
    <div className="page">
      <PageHeader title="Broker" action={refreshBtn} />
      <div className="screen">
        <div className="card">
          <div className="row-between" style={{ marginBottom: 6 }}>
            <p className="card-title">Dhan</p>
            <span
              className="pill"
              style={{
                background: connected ? "var(--buy-bg)" : "var(--sell-bg)",
                color: connected ? "var(--buy)" : "var(--sell)",
              }}
            >
              {connected
                ? "CONNECTED"
                : (status?.status || "NOT CONNECTED").replace(/_/g, " ").toUpperCase()}
            </span>
          </div>

          {connected && (
            <>
              <Info k="Client ID" v={status?.dhanClientId || "—"} />
              <Info k="Auth" v={prettyCred(status?.credentialType)} />
              <Info k="Static IP" v={status?.staticIp || "not set (reads only)"} />
              <Info k="Token valid until" v={fmtExpiry(status?.accessTokenExpiresAt)} />
              <p className="dim" style={{ marginTop: 10, marginBottom: 0, fontSize: 12 }}>
                Dhan tokens last 24 hours — you'll be asked to reconnect when it expires.
              </p>
              {status?.lastError ? (
                <p style={{ color: "var(--red)", marginTop: 8, marginBottom: 0 }}>{status.lastError}</p>
              ) : null}
              <button className="btn danger" style={{ marginTop: 14 }} onClick={doDisconnect}>
                Disconnect
              </button>
            </>
          )}
        </div>

        {!connected && (
          <div className="card">
            <p className="card-title">{tokenExpired ? "Reconnect Dhan" : "Connect Dhan"}</p>
            <p className="dim" style={{ marginTop: 8 }}>
              {tokenExpired
                ? "Your daily Dhan token has expired. Generate a fresh one on Dhan and paste it below (or log in again via API key)."
                : "Your credentials are stored encrypted by Zap and never shared with the AI. Orders still need your approval here."}
            </p>
            {status?.lastError && !tokenExpired ? (
              <p style={{ color: "var(--red)" }}>{status.lastError}</p>
            ) : null}

            <div className="mode-toggle">
              {(["access_token", "api_key"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    haptics.selection();
                    setMode(m);
                  }}
                  className={mode === m ? "mode-btn active" : "mode-btn"}
                >
                  {m === "access_token" ? "Access token" : "API key"}
                </button>
              ))}
            </div>

            <input
              className="input"
              placeholder="Dhan client ID"
              value={dhanClientId}
              onChange={(e) => setDhanClientId(e.target.value)}
              autoCapitalize="none"
              inputMode="numeric"
            />

            {mode === "access_token" ? (
              <>
                <input
                  className="input"
                  placeholder="Access token (24h)"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  autoCapitalize="none"
                />
                <button
                  className="btn"
                  style={{ marginTop: 14 }}
                  onClick={doConnect}
                  disabled={busy || !dhanClientId || !accessToken}
                >
                  {busy ? <Spinner dark /> : tokenExpired ? "Reconnect Dhan" : "Connect Dhan"}
                </button>
              </>
            ) : (
              <>
                <input
                  className="input"
                  placeholder="API key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  autoCapitalize="none"
                />
                <input
                  className="input"
                  placeholder="API secret"
                  type="password"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  autoCapitalize="none"
                />
                {!consentStarted ? (
                  <button
                    className="btn"
                    style={{ marginTop: 14 }}
                    onClick={startConsent}
                    disabled={busy || !apiKey || !apiSecret || !dhanClientId}
                  >
                    {busy ? (
                      <Spinner dark />
                    ) : (
                      <>
                        <IconExternalLink size={18} stroke={2.2} /> Log in with Dhan
                      </>
                    )}
                  </button>
                ) : (
                  <>
                    <p className="dim" style={{ marginTop: 12 }}>
                      After logging in, paste the <strong>tokenId</strong> from the redirect URL:
                    </p>
                    <input
                      className="input"
                      placeholder="tokenId"
                      value={tokenId}
                      onChange={(e) => setTokenId(e.target.value)}
                      autoCapitalize="none"
                    />
                    <button
                      className="btn"
                      style={{ marginTop: 14 }}
                      onClick={finishConsent}
                      disabled={busy || !tokenId}
                    >
                      {busy ? <Spinner dark /> : "Complete connection"}
                    </button>
                    <button
                      type="button"
                      className="link-btn"
                      style={{ marginTop: 6 }}
                      onClick={startConsent}
                      disabled={busy}
                    >
                      Reopen Dhan login
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {user ? (
          <p className="dim" style={{ textAlign: "center", marginBottom: 12 }}>
            Signed in as {user.email}
          </p>
        ) : null}
        <button className="btn secondary" onClick={signOut}>
          Sign out
        </button>
      </div>
    </div>
  );
}
