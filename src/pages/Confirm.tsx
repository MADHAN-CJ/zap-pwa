import { useCallback, useEffect, useMemo, useState } from "react";
import { IconChecks, IconPlus, IconX } from "@tabler/icons-react";
import ConsoleHeader from "@/components/ConsoleHeader";
import OrderCard, { type Order } from "@/components/OrderCard";
import EdisWizard from "@/components/EdisWizard";
import { Spinner, useUI } from "@/components/ui";
import { haptics } from "@/lib/haptics";
import { inr } from "@/lib/format";
import { type Draft, type MarginPreview, placeDraft, previewMargin } from "@/api/orders";
import { confirmAll, confirmOrder, deleteOrder, listPending } from "@/api/dashboard";

// Dhan exchangeSegment → short exchange label for the card ("NSE_EQ" → "NSE").
function prettyExchange(seg?: string | null): string {
  if (!seg) return "NSE";
  const [exch, kind] = seg.split("_");
  if (kind === "FNO") return `${exch} F&O`;
  if (kind === "CURRENCY") return `${exch} CDS`;
  if (kind === "COMM") return exch;
  return exch;
}

// Map a backend DRAFT order to the card's shape. ltp/margin aren't in the
// order payload, so they're left undefined (the card computes order value from
// price and never fabricates a figure for market orders).
function toOrder(d: Draft): Order {
  return {
    id: d.id,
    sym: d.symbol,
    exch: prettyExchange(d.exchangeSegment),
    side: d.side,
    qty: d.quantity,
    price: d.price,
    type: d.orderType?.toUpperCase() === "MARKET" ? "MARKET" : "LIMIT",
    product: d.productType,
    validity: d.validity,
    trigger: d.triggerPrice,
    createdAt: d.createdAt,
    source: d.source,
  };
}

// CDSL eDIS wizard target — set when a sell confirm returns EDIS_REQUIRED
// (Dhan account without DDPI). The wizard walks T-PIN → CDSL page → confirm.
type EdisState = {
  draftId: string;
  isin: string;
  qty: number;
  exchange: "NSE" | "BSE";
};

// Quick-draft composer: stages a DRAFT (never reaches the market) with an
// optional read-only margin preview (POST /orders/margin — creates nothing).
function DraftComposer({ onPlaced }: { onPlaced: () => void }) {
  const { toast } = useUI();
  const [symbol, setSymbol] = useState("");
  const [qty, setQty] = useState("");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [margin, setMargin] = useState<MarginPreview | null>(null);
  const [checking, setChecking] = useState(false);
  const [placing, setPlacing] = useState(false);

  const checkMargin = async () => {
    const q = parseInt(qty, 10);
    if (!symbol || !q) return;
    setChecking(true);
    setMargin(null);
    const res = await previewMargin({
      side,
      symbol: symbol.toUpperCase(),
      quantity: q,
      orderType: "MARKET",
    });
    setChecking(false);
    if (res.ok) setMargin(res.data.margin);
    else toast("error", "Margin check failed", res.description || res.error);
  };

  const submitDraft = async () => {
    const q = parseInt(qty, 10);
    if (!symbol || !q) return;
    setPlacing(true);
    const res = await placeDraft({
      side,
      symbol: symbol.toUpperCase(),
      quantity: q,
      orderType: "MARKET",
    });
    setPlacing(false);
    if (res.ok) {
      setSymbol("");
      setQty("");
      setMargin(null);
      onPlaced();
    } else {
      toast("error", "Could not draft", res.description || res.error);
    }
  };

  return (
    <div className="oc" style={{ marginBottom: 14 }}>
      <div className="oc-money-k" style={{ marginBottom: 10 }}>
        New draft (MARKET)
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {(["BUY", "SELL"] as const).map((s) => (
          <button
            key={s}
            className={side === s ? (s === "BUY" ? "side-pill buy" : "side-pill sell") : "pill"}
            style={{ flex: "0 0 auto" }}
            onClick={() => setSide(s)}
          >
            {s}
          </button>
        ))}
        <input
          className="input"
          placeholder="Symbol (e.g. TCS)"
          style={{ textTransform: "uppercase", flex: 1, minWidth: 0 }}
          value={symbol}
          onChange={(e) => {
            setSymbol(e.target.value);
            setMargin(null);
          }}
        />
        <input
          className="input"
          placeholder="Qty"
          inputMode="numeric"
          style={{ width: 72 }}
          value={qty}
          onChange={(e) => {
            setQty(e.target.value.replace(/\D/g, ""));
            setMargin(null);
          }}
        />
      </div>
      {margin && (
        <p
          className="dim"
          style={{
            marginTop: 10,
            marginBottom: 0,
            color: margin.affordable === false ? "var(--sell)" : undefined,
          }}
        >
          Needs {inr(margin.requiredMargin)}
          {margin.brokerage ? ` (+${inr(margin.brokerage)} brokerage)` : ""}
          {margin.availableBalance != null ? ` · available ${inr(margin.availableBalance)}` : ""}
          {margin.affordable === false
            ? ` · short ${inr(margin.shortfall)}`
            : margin.affordable === true
              ? " · OK"
              : ""}
        </p>
      )}
      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <button
          className="btn secondary"
          style={{ flex: 1 }}
          onClick={checkMargin}
          disabled={checking || !symbol || !qty}
        >
          {checking ? <Spinner /> : "Check margin"}
        </button>
        <button
          className="btn"
          style={{ flex: 1 }}
          onClick={submitDraft}
          disabled={placing || !symbol || !qty}
        >
          Add draft (MARKET)
        </button>
      </div>
    </div>
  );
}

export default function Confirm() {
  const { toast, confirm } = useUI();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [version, setVersion] = useState(0); // bumped on (re)load so cards remount fresh
  const [edis, setEdis] = useState<EdisState | null>(null);

  const load = useCallback(async () => {
    const res = await listPending("DRAFT");
    if (res.ok) setOrders(res.data.orders.map(toOrder));
    else toast("error", "Couldn't load orders", res.description || res.error);
    setVersion((v) => v + 1);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const { buys, sells } = useMemo(
    () => ({
      buys: orders.filter((o) => o.side === "BUY").length,
      sells: orders.filter((o) => o.side === "SELL").length,
    }),
    [orders]
  );

  const remove = (id: string) => setOrders((os) => os.filter((o) => o.id !== id));

  // The ONLY path that submits to the market: dashboard confirm (human action).
  const approve = async (o: Order) => {
    const res = await confirmOrder(o.id);
    if (res.ok) {
      const did = res.data.order?.dhanOrderId;
      toast("success", `Approved ${o.sym}`, did ? `Sent to the market (#${did}).` : undefined);
      remove(o.id);
    } else if (res.code === "EDIS_REQUIRED" && res.data?.isin) {
      // Sell on a DDPI-less account: the draft was reverted to DRAFT server-side.
      // Walk the CDSL authorization, then re-confirm this same draft.
      setEdis({
        draftId: o.id,
        isin: res.data.isin,
        qty: res.data.qty || o.qty,
        exchange: res.data.exchange === "BSE" ? "BSE" : "NSE",
      });
      load(); // bring the (still-DRAFT) card back into the queue
    } else {
      toast("error", "Could not approve", res.description || res.error);
      load(); // rollback — refetch the real queue
    }
  };

  const reject = async (o: Order) => {
    const res = await deleteOrder(o.id);
    if (res.ok) {
      toast("info", `Rejected ${o.sym}`);
      remove(o.id);
    } else {
      toast("error", "Could not reject", res.description || res.error);
      load();
    }
  };

  const approveAll = async () => {
    if (!orders.length) return;
    const ok = await confirm({
      title: "Approve all",
      message: `Submit all ${orders.length} pending orders to the market?`,
      confirmText: "Approve all",
      destructive: true,
    });
    if (!ok) return;
    haptics.success();
    const res = await confirmAll();
    if (res.ok) {
      toast("success", "Done", `${res.data.confirmed} submitted, ${res.data.failed} failed.`);
    } else {
      toast("error", "Could not approve all", res.description || res.error);
    }
    load();
  };

  return (
    <div className="orders">
      <ConsoleHeader buys={buys} sells={sells} onRefresh={load} loading={loading} />

      {edis && (
        <EdisWizard
          isin={edis.isin}
          qty={edis.qty}
          exchange={edis.exchange}
          onConfirm={() => {
            const id = edis.draftId;
            setEdis(null);
            const o = orders.find((x) => x.id === id);
            if (o) approve(o);
            else load();
          }}
          onClose={() => setEdis(null)}
        />
      )}

      {loading ? (
        <div className="feed">
          {[0, 1, 2].map((i) => (
            <div key={i} className="oc" style={{ marginBottom: 14 }}>
              <div className="oc-head">
                <div className="skeleton" style={{ width: 42, height: 42, borderRadius: 12 }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton" style={{ width: 120, height: 18, marginBottom: 7 }} />
                  <div className="skeleton" style={{ width: 80, height: 12 }} />
                </div>
                <div className="skeleton" style={{ width: 90, height: 18 }} />
              </div>
              <hr className="oc-div" />
              <div className="skeleton" style={{ width: "100%", height: 44, borderRadius: 13 }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="feed">
          <button
            className="btn secondary"
            style={{ width: "100%", marginBottom: 14 }}
            onClick={() => setShowForm((v) => !v)}
            aria-label="New draft"
          >
            {showForm ? <IconX size={18} stroke={2.2} /> : <IconPlus size={18} stroke={2.2} />}
            &nbsp;{showForm ? "Close" : "New draft"}
          </button>
          {showForm && (
            <DraftComposer
              onPlaced={() => {
                setShowForm(false);
                load();
              }}
            />
          )}

          {orders.length === 0 ? (
            <div className="oc-empty">
              <div className="ic">
                <IconChecks size={34} stroke={2} />
              </div>
              <h3>All caught up</h3>
              <p>No orders waiting for approval.</p>
            </div>
          ) : (
            <>
              <div className="feed-hint">Swipe right to approve · left to reject</div>
              {orders.map((o) => (
                <OrderCard
                  key={`${o.id}:${version}`}
                  order={o}
                  onApprove={() => approve(o)}
                  onReject={() => reject(o)}
                />
              ))}
              <button className="approve-all-btn" onClick={approveAll}>
                Approve all · <span className="num">{orders.length}</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
