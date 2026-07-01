import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BrokerStatus,
  connect,
  consentComplete,
  consentStart,
  disconnect,
  getStatus,
} from "@/api/broker";
import { clearAuth, getUser } from "@/store/auth";
import { Spinner, useUI } from "@/components/ui";

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

  const load = useCallback(async () => {
    const res = await getStatus();
    if (res.ok) setStatus(res.data.connection);
    setLoading(false);
  }, []);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const doConnect = async () => {
    setBusy(true);
    const res = await connect({ dhanClientId, credentialType: "access_token", accessToken });
    setBusy(false);
    if (res.ok) {
      toast("success", "Connected", "Dhan account connected.");
      load();
    } else toast("error", "Could not connect", res.error);
  };

  const startConsent = async () => {
    setBusy(true);
    const res = await consentStart({ apiKey, apiSecret, dhanClientId });
    setBusy(false);
    if (res.ok) {
      setConsentStarted(true);
      window.open(res.data.loginUrl, "_blank", "noopener");
    } else toast("error", "Could not start consent", res.error);
  };

  const finishConsent = async () => {
    setBusy(true);
    const res = await consentComplete(tokenId.trim());
    setBusy(false);
    if (res.ok) {
      setConsentStarted(false);
      toast("success", "Connected", "Dhan account connected.");
      load();
    } else toast("error", "Could not complete", res.error);
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
    load();
  };

  const signOut = () => {
    clearAuth();
    navigate("/login", { replace: true });
  };

  if (loading) {
    return (
      <div className="screen">
        <div className="center-fill">
          <Spinner />
        </div>
      </div>
    );
  }

  const connected = status?.connected;
  const user = getUser();

  return (
    <div className="screen">
      <div className="screen-header" />
      <div className="card">
        <div className="row-between" style={{ marginBottom: 6 }}>
          <p className="card-title">Dhan</p>
          <span
            className="pill"
            style={{
              background: connected ? "#0e2a1a" : "#2a1414",
              color: connected ? "var(--green)" : "var(--red)",
            }}
          >
            {connected ? "CONNECTED" : (status?.status || "NOT CONNECTED").toUpperCase()}
          </span>
        </div>
        {connected && (
          <>
            <Info k="Client ID" v={status?.dhanClientId || "—"} />
            <Info k="Auth" v={status?.credentialType || "—"} />
            <Info k="Static IP" v={status?.staticIp || "not set (reads only)"} />
            {status?.lastError ? (
              <p style={{ color: "var(--red)", marginTop: 8, marginBottom: 0 }}>
                {status.lastError}
              </p>
            ) : null}
            <button className="btn danger" style={{ marginTop: 14 }} onClick={doDisconnect}>
              Disconnect
            </button>
          </>
        )}
      </div>

      {!connected && (
        <div className="card">
          <p className="card-title">Connect Dhan</p>
          <div className="mode-toggle">
            {(["access_token", "api_key"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="mode-btn"
                style={
                  mode === m ? { background: "var(--accent)", color: "var(--accent-text)" } : undefined
                }
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
                {busy ? <Spinner dark /> : "Connect"}
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
                  {busy ? <Spinner dark /> : "Log in with Dhan"}
                </button>
              ) : (
                <>
                  <p className="dim" style={{ marginTop: 12 }}>
                    After logging in, paste the tokenId from the redirect URL:
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
  );
}
