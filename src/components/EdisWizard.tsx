import { useEffect, useRef, useState, type ReactNode } from "react";
import { IconCheck, IconX, IconShieldCheck } from "@tabler/icons-react";
import { edisForm, edisStatus, edisTpin } from "@/api/dashboard";
import { Spinner, useUI } from "@/components/ui";
import { haptics } from "@/lib/haptics";

// CDSL eDIS authorization wizard — shown when confirming a sell on a Dhan
// account without DDPI. Three steps, each ticked as it completes:
//   1 send the CDSL T-PIN to the user's phone (resend after a 10s cooldown),
//   2 open CDSL's secure page where the T-PIN is entered (the PIN input lives
//     on CDSL's page by design — it never touches Zap),
//   3 wait for CDSL confirmation (auto-polled) → confirm the order.
// Dhan is the final authority at placeOrder, so the poll is deliberately
// permissive (see isAuthorized) and a "confirm anyway" escape hatch appears if
// it still hasn't cleared after a few rounds.

type Props = {
  isin: string;
  qty: number;
  exchange: "NSE" | "BSE";
  onConfirm: () => void; // re-confirm the reverted draft
  onClose: () => void;
};

const POLL_MS = 4000;
const RESEND_COOLDOWN_S = 10;

// When Dhan reports an approved quantity, honour it. But live it often returns
// a bare 200 with no quantity fields at all (observed 2026-07-20), and
// demanding aprvdQty >= qty would spin here forever. A successful inquiry is
// therefore enough to move on: Dhan re-validates the CDSL mark at placeOrder,
// so a premature pass costs at most a retry, never a wrong trade.
const isAuthorized = (d: { aprvdQty?: number }, qty: number): boolean => {
  const approved = Number(d?.aprvdQty);
  return Number.isFinite(approved) ? approved >= qty : true;
};

export default function EdisWizard({ isin, qty, exchange, onConfirm, onClose }: Props) {
  const { toast } = useUI();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [authorized, setAuthorized] = useState(false);
  const [polls, setPolls] = useState(0);
  const pollRef = useRef<number | null>(null);

  // Resend countdown tick.
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendIn]);

  const stopPolling = () => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };
  useEffect(() => stopPolling, []);

  const check = async () => {
    const res = await edisStatus(isin);
    if (res.ok && isAuthorized(res.data, qty)) {
      stopPolling();
      setAuthorized(true);
    } else {
      setPolls((n) => n + 1);
    }
  };

  const sendTpin = async () => {
    setBusy(true);
    const res = await edisTpin();
    setBusy(false);
    if (res.ok) {
      toast("success", "T-PIN sent", "Check the mobile registered with CDSL.");
      setResendIn(RESEND_COOLDOWN_S);
      setStep((s) => (s === 1 ? 2 : s));
    } else {
      toast("error", "Could not send T-PIN", res.description || res.error);
    }
  };

  const openCdsl = async () => {
    setBusy(true);
    const res = await edisForm({ isin, qty, exchange });
    setBusy(false);
    if (!res.ok) {
      toast("error", "Could not load CDSL page", res.description || res.error);
      return;
    }
    const w = window.open("", "_blank");
    if (!w) {
      toast("error", "Popup blocked", "Allow popups for this site and try again.");
      return;
    }
    w.document.open();
    w.document.write(res.data.edisFormHtml);
    w.document.close();
    setStep(3);
    stopPolling();
    pollRef.current = window.setInterval(check, POLL_MS);
  };

  const finish = () => {
    stopPolling();
    haptics.success();
    onConfirm();
  };

  const StepRow = ({
    n,
    title,
    children,
  }: {
    n: 1 | 2 | 3;
    title: string;
    children?: ReactNode;
  }) => {
    const done = n < step || (n === 3 && authorized);
    const active = n === step && !done;
    return (
      <div className="edis-step">
        <div className={`edis-badge${done ? " done" : active ? " active" : ""}`}>
          {done ? <IconCheck size={14} stroke={3} /> : n}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, paddingTop: 3 }}>{title}</div>
          {active ? <div style={{ marginTop: 10 }}>{children}</div> : null}
        </div>
      </div>
    );
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
        <div className="row-between" style={{ marginBottom: 2 }}>
          <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <IconShieldCheck size={20} stroke={1.9} /> Authorize sale with CDSL
          </h3>
          <button className="edis-close" onClick={onClose} aria-label="Close">
            <IconX size={16} stroke={2.2} />
          </button>
        </div>
        <p style={{ marginTop: 6 }}>
          One-time approval for today's sale ({isin} · qty {qty}). Enable DDPI in the Dhan
          app once to skip this permanently.
        </p>

        <StepRow n={1} title="Send T-PIN to your phone">
          <button className="btn" onClick={sendTpin} disabled={busy}>
            {busy ? <Spinner dark /> : "Send T-PIN"}
          </button>
        </StepRow>

        <StepRow n={2} title="Enter the T-PIN on CDSL's page">
          <button className="btn" onClick={openCdsl} disabled={busy}>
            {busy ? <Spinner dark /> : "Open CDSL page"}
          </button>
          <div style={{ marginTop: 8 }}>
            <button className="edis-link" onClick={sendTpin} disabled={busy || resendIn > 0}>
              {resendIn > 0 ? `Resend T-PIN in ${resendIn}s` : "Didn't get it? Resend T-PIN"}
            </button>
          </div>
        </StepRow>

        <StepRow n={3} title="CDSL confirmation">
          <div style={{ gap: 10, alignItems: "center", display: "flex" }}>
            <Spinner />
            <span className="dim" style={{ fontSize: 13 }}>
              Waiting for CDSL… finish the T-PIN step in the other tab.
            </span>
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 16 }}>
            <button className="edis-link" onClick={check}>
              Check now
            </button>
            <button className="edis-link" onClick={openCdsl}>
              Reopen CDSL page
            </button>
          </div>
          {polls >= 3 ? (
            <p className="dim" style={{ fontSize: 12, marginTop: 10, marginBottom: 0 }}>
              Completed on CDSL but still waiting here? CDSL's status can lag — you can
              confirm anyway; Dhan makes the final check.{" "}
              <button className="edis-link" onClick={finish}>
                Confirm anyway
              </button>
            </p>
          ) : null}
        </StepRow>

        {authorized ? (
          <button className="btn" style={{ marginTop: 14, background: "var(--buy)" }} onClick={finish}>
            <IconCheck size={18} stroke={2.6} /> Authorized — Approve order
          </button>
        ) : null}
      </div>
    </div>
  );
}
