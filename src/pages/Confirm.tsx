import { useCallback, useEffect, useState } from "react";
import { Draft, placeDraft } from "@/api/orders";
import { confirmAll, confirmOrder, deleteOrder, listPending } from "@/api/dashboard";
import { Spinner, useUI } from "@/components/ui";
import SwipeRow from "@/components/SwipeRow";
import { inr } from "@/lib/format";

export default function Confirm() {
  const { toast, confirm } = useUI();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // quick-draft form
  const [symbol, setSymbol] = useState("");
  const [qty, setQty] = useState("");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");

  const load = useCallback(async () => {
    const res = await listPending("DRAFT");
    if (res.ok) setDrafts(res.data.orders);
    setLoading(false);
  }, []);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const onConfirm = async (id: string) => {
    setBusyId(id);
    const res = await confirmOrder(id);
    setBusyId(null);
    if (res.ok) toast("success", "Submitted", "Order sent to the market.");
    else toast("error", "Could not confirm", res.description || res.error);
    load();
  };

  const onDelete = async (id: string) => {
    setBusyId(id);
    const res = await deleteOrder(id);
    setBusyId(null);
    if (res.ok) load();
    else toast("error", "Could not delete", res.error);
  };

  const onConfirmAll = async () => {
    if (drafts.length === 0) return;
    const ok = await confirm({
      title: "Confirm all",
      message: `Submit all ${drafts.length} pending orders to the market?`,
      confirmText: "Confirm all",
      destructive: true,
    });
    if (!ok) return;
    const res = await confirmAll();
    if (res.ok)
      toast("success", "Done", `${res.data.confirmed} submitted, ${res.data.failed} failed.`);
    else toast("error", "Error", res.error);
    load();
  };

  const submitDraft = async () => {
    const q = parseInt(qty, 10);
    if (!symbol || !q) return;
    const res = await placeDraft({
      side,
      symbol: symbol.toUpperCase(),
      quantity: q,
      orderType: "MARKET",
    });
    if (res.ok) {
      setSymbol("");
      setQty("");
      setShowForm(false);
      load();
    } else {
      toast("error", "Could not draft", res.description || res.error);
    }
  };

  return (
    <div className="screen">
      <div className="screen-header row-between">
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{drafts.length} pending</h2>
        <button
          className="pill"
          style={{
            background: "var(--accent)",
            color: "var(--accent-text)",
            opacity: drafts.length === 0 ? 0.4 : 1,
          }}
          onClick={onConfirmAll}
        >
          Confirm all
        </button>
      </div>
      <p className="dim" style={{ marginTop: 4, marginBottom: 12 }}>
        Swipe a card right to confirm, left to delete.
      </p>

      {showForm && (
        <div className="card" style={{ background: "var(--card-alt)", padding: 14 }}>
          <div className="side-toggle">
            {(["BUY", "SELL"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSide(s)}
                className="side-btn"
                style={
                  side === s
                    ? { background: s === "BUY" ? "var(--green)" : "var(--red)", color: "#06210f" }
                    : undefined
                }
              >
                {s}
              </button>
            ))}
          </div>
          <input
            className="input"
            placeholder="Symbol (e.g. TCS)"
            style={{ textTransform: "uppercase" }}
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
          />
          <input
            className="input"
            placeholder="Qty"
            inputMode="numeric"
            value={qty}
            onChange={(e) => setQty(e.target.value.replace(/\D/g, ""))}
          />
          <button
            className="btn"
            style={{ background: "var(--blue)", color: "#04223f", marginTop: 12 }}
            onClick={submitDraft}
          >
            Add draft (MARKET)
          </button>
        </div>
      )}

      {loading ? (
        <div className="center-fill">
          <Spinner />
        </div>
      ) : drafts.length === 0 ? (
        <div className="empty">
          <div style={{ fontSize: 44, color: "var(--text-dim)" }}>✓</div>
          <p style={{ marginTop: 12, fontSize: 16 }}>No pending orders.</p>
          <p className="dim" style={{ textAlign: "center" }}>
            Orders your AI drafts will appear here for confirmation.
          </p>
        </div>
      ) : (
        <div>
          {drafts.map((d) => {
            const isBuy = d.side === "BUY";
            return (
              <SwipeRow
                key={d.id}
                disabled={busyId === d.id}
                onConfirm={() => onConfirm(d.id)}
                onDelete={() => onDelete(d.id)}
              >
                <div className="order-row">
                  <div
                    className="side-tag"
                    style={{ background: isBuy ? "#0e2a1a" : "#2a1414" }}
                  >
                    <span style={{ color: isBuy ? "var(--green)" : "var(--red)", fontWeight: 700 }}>
                      {d.side}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>
                      {d.symbol} · {d.quantity}
                    </div>
                    <div className="dim" style={{ marginTop: 3 }}>
                      {d.orderType}
                      {d.price ? ` @ ${inr(d.price)}` : ""} · {d.productType} ·{" "}
                      {d.source === "ai" ? "drafted by AI" : "manual"}
                    </div>
                  </div>
                  {busyId === d.id ? <Spinner /> : null}
                </div>
              </SwipeRow>
            );
          })}
        </div>
      )}

      <button className="fab" onClick={() => setShowForm((v) => !v)} aria-label="New draft">
        {showForm ? "✕" : "+"}
      </button>
    </div>
  );
}
