import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { IconBolt, IconChevronRight } from "@tabler/icons-react";
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

// The three ways in. Broker connect happens after sign-in (existing Broker
// flow, zap-api side); manual entry is the Add-position path.
// TODO(open question, from the design doc): for traders whose broker isn't
// listed, manual entry is the main road, not a fallback — should it be first?
const PATHS = [
  { key: "zerodha", label: "Connect Zerodha", avatar: "Z" },
  { key: "dhan", label: "Connect Dhan", avatar: "D" },
  { key: "manual", label: "Type a position myself", avatar: null },
] as const;

/** /login — screen one. Read-only positioning first, then email → OTP.
 *  Auth backend exists (/auth/request-otp, /auth/verify-otp); broker
 *  connect after sign-in is Madhan's side. */
export default function Login() {
  const nav = useNavigate();
  const [step, setStep] = useState<"landing" | "email" | "otp">("landing");
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
      {/* Brand row: wordmark left, read-only chip right */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <IconBolt size={20} stroke={2.4} style={{ color: "var(--brand)" }} />
          <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.3 }}>Zap</span>
        </span>
        <span
          className="mono"
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 0.5,
            color: "var(--ink-2)",
            border: "1px solid var(--line-strong)",
            borderRadius: "var(--radius-full)",
            padding: "5px 12px",
          }}
        >
          read only
        </span>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {step === "landing" ? (
          <motion.div
            key="landing"
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={springSoft}
            style={{ display: "flex", flexDirection: "column", paddingTop: 30 }}
          >
            <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.6, lineHeight: 1.2 }}>
              A second pair of eyes on the trade you're in.
            </h1>
            <p style={{ fontSize: 15, lineHeight: 1.55, color: "var(--ink-2)", marginTop: 14 }}>
              Tell it what you're watching for, in your own words. It re-reads your position, the
              option chain and the index, and reaches you only when your own thinking is on the
              line.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 30 }}>
              {PATHS.map((p, i) => (
                <motion.button
                  key={p.key}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...springSoft, delay: 0.08 + i * 0.06 }}
                  whileTap={{ scale: pressScale }}
                  onClick={() => {
                    tapHaptic();
                    setStep("email"); // all paths sign in first; broker connect follows
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    textAlign: "left",
                    padding: "15px 16px",
                    background: "var(--surface)",
                    borderRadius: "var(--radius)",
                    boxShadow: "var(--shadow)",
                  }}
                >
                  {p.avatar && (
                    <span
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "var(--radius-full)",
                        background: "var(--brand-soft)",
                        color: "var(--brand)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {p.avatar}
                    </span>
                  )}
                  <span style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>{p.label}</span>
                  <IconChevronRight size={17} stroke={2.2} style={{ color: "var(--ink-3)" }} />
                </motion.button>
              ))}
            </div>

            <p style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ink-3)", marginTop: 16 }}>
              Zap can read your positions. It can never place, modify or cancel an order.
            </p>

            {MOCK && (
              <button
                onClick={() => nav("/watch", { replace: true })}
                style={{
                  fontSize: 13,
                  color: "var(--ink-3)",
                  padding: 10,
                  marginTop: 18,
                  alignSelf: "center",
                }}
              >
                Continue in demo mode
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="auth"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={springSoft}
            style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 34 }}
          >
            <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>
              {step === "email" ? "Sign in" : "Enter the code"}
            </h2>
            <p style={{ fontSize: 15, color: "var(--ink-2)", lineHeight: 1.5 }}>
              {step === "email"
                ? "Email first. Your broker connects after."
                : `Code sent to ${email.trim()}. Check your inbox.`}
            </p>

            {step === "email" ? (
              <input
                type="email"
                autoFocus
                autoComplete="email"
                inputMode="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendCode()}
                style={fieldStyle}
              />
            ) : (
              <input
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

            {error && <p style={{ fontSize: 13, color: "var(--flipped)" }}>{error}</p>}

            <motion.button
              whileTap={{ scale: pressScale }}
              transition={spring}
              disabled={busy || (step === "email" ? !email.trim() : code.trim().length < 4)}
              onClick={step === "email" ? sendCode : verify}
              animate={{
                opacity:
                  busy || (step === "email" ? !email.trim() : code.trim().length < 4) ? 0.45 : 1,
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

            <button
              onClick={() => {
                setStep(step === "otp" ? "email" : "landing");
                setCode("");
                setError(null);
              }}
              style={{ fontSize: 13, color: "var(--ink-2)", padding: 8 }}
            >
              {step === "otp" ? "Different email" : "Back"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </Screen>
  );
}
