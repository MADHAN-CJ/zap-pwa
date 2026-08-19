import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Screen } from "@/components/Screen";
import { requestOtp, verifyOtp } from "@/api/auth";
import { MOCK } from "@/api/watch";
import { saveAuth } from "@/store/auth";
import { spring, springSoft, pressScale } from "@/lib/motion";
import { confirmHaptic, tapHaptic } from "@/lib/haptics";
import type { CSSProperties } from "react";

const fieldStyle: CSSProperties = {
  width: "100%",
  fontSize: 16, // iOS zoom floor
  padding: "14px 16px",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--line)",
  background: "var(--surface-2)",
  color: "var(--ink)",
  outline: "none",
};

/** /login — email → OTP. UI only on this branch; zap-api auth already
 *  exists (/auth/request-otp, /auth/verify-otp) — Madhan owns the backend. */
export default function Login() {
  const nav = useNavigate();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode() {
    if (!email.trim() || busy) return;
    tapHaptic();
    setBusy(true);
    setError(null);
    const r = await requestOtp(email.trim());
    setBusy(false);
    if (r.ok) setStep("otp");
    else setError(r.error || "Couldn't send the code. Try again.");
  }

  async function verify() {
    if (code.trim().length < 4 || busy) return;
    confirmHaptic();
    setBusy(true);
    setError(null);
    const r = await verifyOtp(email.trim(), code.trim());
    setBusy(false);
    if (r.ok) {
      saveAuth(r.data.token, r.data.user);
      nav("/watch", { replace: true });
    } else {
      setError(r.error || "That code didn't work. Try again.");
    }
  }

  return (
    <Screen padBottom={false}>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          paddingBottom: "18dvh",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springSoft}
        >
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>Zap</h1>
          <p style={{ fontSize: 15, color: "var(--ink-2)", marginTop: 6, lineHeight: 1.5 }}>
            {step === "email"
              ? "A second pair of eyes on your open trades. Sign in to start."
              : `Code sent to ${email.trim()}. Check your inbox.`}
          </p>
        </motion.div>

        <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 12 }}>
          <AnimatePresence mode="popLayout" initial={false}>
            {step === "email" ? (
              <motion.input
                key="email"
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={spring}
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendCode()}
                style={fieldStyle}
              />
            ) : (
              <motion.input
                key="otp"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 24 }}
                transition={spring}
                autoFocus
                autoComplete="one-time-code"
                inputMode="numeric"
                placeholder="One-time code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && verify()}
                className="mono"
                style={{ ...fieldStyle, letterSpacing: 4 }}
              />
            )}
          </AnimatePresence>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={springSoft}
              style={{ fontSize: 13, color: "var(--flipped)" }}
            >
              {error}
            </motion.p>
          )}

          <motion.button
            whileTap={{ scale: pressScale }}
            transition={spring}
            disabled={busy || (step === "email" ? !email.trim() : code.trim().length < 4)}
            onClick={step === "email" ? sendCode : verify}
            animate={{
              opacity: busy || (step === "email" ? !email.trim() : code.trim().length < 4) ? 0.45 : 1,
            }}
            style={{
              padding: "15px 18px",
              borderRadius: "var(--radius-sm)",
              background: "var(--brand)",
              color: "var(--brand-ink)",
              fontSize: 17,
              fontWeight: 600,
            }}
          >
            {busy ? "One sec…" : step === "email" ? "Send code" : "Sign in"}
          </motion.button>

          {step === "otp" && (
            <button
              onClick={() => {
                setStep("email");
                setCode("");
                setError(null);
              }}
              style={{ fontSize: 13, color: "var(--ink-2)", padding: 8 }}
            >
              Different email
            </button>
          )}

          {MOCK && (
            <button
              onClick={() => nav("/watch", { replace: true })}
              style={{ fontSize: 13, color: "var(--ink-3)", padding: 8 }}
            >
              Continue in demo mode
            </button>
          )}
        </div>
      </div>
    </Screen>
  );
}
