import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { requestOtp, verifyOtp } from "@/api/auth";
import { saveAuth } from "@/store/auth";
import { Spinner } from "@/components/ui";

export default function Login() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await requestOtp(email.trim().toLowerCase());
    setLoading(false);
    if (res.ok) setStep("otp");
    else setError(res.error);
  };

  const verify = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await verifyOtp(email.trim().toLowerCase(), otp.trim());
    setLoading(false);
    if (res.ok && res.data.token) {
      saveAuth(res.data.token, res.data.user);
      navigate("/orders", { replace: true });
    } else {
      setError(res.ok ? "Login failed" : res.error);
    }
  };

  return (
    <div className="app-shell">
      <div className="login-wrap">
        <h1 className="brand">
          <span style={{ color: "var(--accent)" }}>Zap</span> Trade
        </h1>
        <p className="dim" style={{ marginTop: 6, marginBottom: 32 }}>
          The AI drafts. You commit.
        </p>

        {step === "email" ? (
          <form onSubmit={sendOtp}>
            <label className="field-label">Email</label>
            <input
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              type="email"
              autoCapitalize="none"
              autoComplete="email"
              autoFocus
            />
            <button className="btn" style={{ marginTop: 20 }} disabled={loading || !email} type="submit">
              {loading ? <Spinner dark /> : "Send code"}
            </button>
          </form>
        ) : (
          <form onSubmit={verify}>
            <label className="field-label">Enter the 6-digit code sent to {email}</label>
            <input
              className="input"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              autoFocus
            />
            <button
              className="btn"
              style={{ marginTop: 20 }}
              disabled={loading || otp.length < 6}
              type="submit"
            >
              {loading ? <Spinner dark /> : "Verify & sign in"}
            </button>
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                setStep("email");
                setOtp("");
                setError(null);
              }}
            >
              Use a different email
            </button>
          </form>
        )}

        {error ? <p className="error-text">{error}</p> : null}
      </div>
    </div>
  );
}
