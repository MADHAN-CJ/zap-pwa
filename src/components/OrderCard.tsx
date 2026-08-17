import { useRef, useState, type PointerEvent } from "react";
import LogoTile from "@/components/LogoTile";
import { companyName } from "@/lib/logos";
import { haptics } from "@/lib/haptics";

export type Side = "BUY" | "SELL";
export type OrderType = "LIMIT" | "MARKET";
export interface Order {
  id: string;
  sym: string;
  exch: string;
  side: Side;
  qty: number;
  price: number | null;
  type: OrderType;
  product: string;
  // Optional — rendered only when present (the card is dynamic; no placeholders).
  validity?: string | null;
  trigger?: number | null;
  createdAt?: string | null;
  margin?: number | null;
  source?: string | null; // "ai" | "manual" — who drafted it
}

const money = (n: number) =>
  "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function prettyProduct(p: string) {
  const u = (p || "").toUpperCase();
  if (u === "INTRADAY" || u === "MIS") return "Intraday";
  if (u === "CNC" || u === "DELIVERY") return "Delivery";
  return p || "";
}

// "just now" / "3m ago" / "2h ago" / "1d ago" — null when the timestamp is absent
// or unparseable, so the caller can omit it entirely rather than show a dash.
function timeAgo(iso?: string | null): string | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 45) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${Math.max(1, m)}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const THRESHOLD = 110;
const MAX = 300;

export default function OrderCard({
  order,
  onApprove,
  onReject,
}: {
  order: Order;
  onApprove: () => void;
  onReject: () => void;
}) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const startX = useRef(0);
  const dxRef = useRef(0);
  const isBuy = order.side === "BUY";

  // Figure = broker-provided margin when available, else the order's notional
  // value (price × qty). Never fabricated.
  const figure =
    order.margin != null ? order.margin : order.price != null ? order.price * order.qty : null;
  const figureLabel = order.margin != null && isBuy ? "Margin req." : "Order value";

  const name = companyName(order.sym);
  const drafted = timeAgo(order.createdAt);
  const validity = order.validity ? order.validity.toUpperCase() : null;
  const product = prettyProduct(order.product);
  const origin = order.source ? (order.source === "ai" ? "AI draft" : "Manual") : null;
  const subParts = [order.exch, product, validity, origin].filter(Boolean);

  // Money-led summary: lead with the number the person is actually committing
  // (order value / margin), and drop qty·price to a supporting line. When there's
  // no value (a market order with no known price), lead with the quantity instead
  // — never a placeholder.
  const shares = `${order.qty} ${order.qty === 1 ? "share" : "shares"}`;
  const priceStr =
    order.type === "MARKET" || order.price == null ? "at market" : `@ ${money(order.price)}`;
  const trig = order.trigger != null ? ` · trigger ${money(order.trigger)}` : "";
  // Currency cards get the price-tag hero (label left, value right); market
  // orders have only qty, so they use a single left-aligned line instead.
  const hasValue = figure != null;
  const heroSub = `${shares} ${priceStr}${trig}`;

  const commit = (kind: "approve" | "reject") => {
    if (leaving) return;
    if (kind === "approve") haptics.success();
    else haptics.error();
    if (kind === "approve") {
      setDragging(false);
      dxRef.current = 480;
      setDx(480); // slide fully out to the right
      setTimeout(() => setLeaving(true), 170);
      setTimeout(onApprove, 470);
    } else {
      setDragging(false);
      dxRef.current = -480;
      setDx(-480); // slide fully out to the left
      setTimeout(() => setLeaving(true), 170);
      setTimeout(onReject, 470);
    }
  };

  // Track the drag on window (no setPointerCapture — that's unreliable for touch
  // pointers on iOS Safari and was silently killing the swipe).
  const down = (e: PointerEvent) => {
    if (leaving) return;
    // Don't hijack presses on the buttons — let their taps through.
    if ((e.target as HTMLElement).closest("button")) return;
    startX.current = e.clientX;
    setDragging(true);

    let armed = false;
    const setBoth = (v: number) => {
      dxRef.current = v;
      setDx(v);
      // tick once when the drag crosses into the commit zone (either direction)
      const nowArmed = Math.abs(v) >= THRESHOLD;
      if (nowArmed && !armed) haptics.selection();
      armed = nowArmed;
    };
    const onMove = (ev: globalThis.PointerEvent) =>
      setBoth(Math.max(-MAX, Math.min(MAX, ev.clientX - startX.current)));
    const teardown = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      setDragging(false);
    };
    const onUp = () => {
      teardown();
      if (dxRef.current >= THRESHOLD) commit("approve");
      else if (dxRef.current <= -THRESHOLD) commit("reject");
      else setBoth(0);
    };
    const onCancel = () => {
      teardown();
      setBoth(0);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
  };

  return (
    <div className={leaving ? "oc-wrap leaving" : "oc-wrap"}>
      <div className="oc-reveal approve" style={{ opacity: dx > 6 ? 1 : 0 }}>
        <span className="lbl">APPROVE</span>
      </div>
      <div className="oc-reveal reject" style={{ opacity: dx < -6 ? 1 : 0 }}>
        <span className="lbl">REJECT</span>
      </div>

      <div
        className="oc"
        style={{
          transform: `translateX(${dx}px)`,
          transition: dragging ? "none" : "transform 0.3s cubic-bezier(0.2, 0.8, 0.3, 1)",
        }}
        onPointerDown={down}
      >
        {/* identity + side */}
        <div className="oc-head">
          <div className="oc-id">
            <LogoTile sym={order.sym} />
            <div className="oc-sym">
              <div className="oc-title">
                <span className="t">{order.sym}</span>
                {name && <span className="oc-name">{name}</span>}
              </div>
              <div className="sub">{subParts.join(" · ")}</div>
            </div>
          </div>
          <div className="oc-meta">
            <span className={isBuy ? "side-pill buy" : "side-pill sell"}>{order.side}</span>
            {drafted && <span className="oc-time">{drafted}</span>}
          </div>
        </div>

        <hr className="oc-div" />

        {/* money-led: what you're committing, with qty·price supporting it */}
        <div className="oc-money">
          {hasValue ? (
            <>
              <div className="oc-money-top">
                <span className="oc-money-k">{figureLabel}</span>
                <span className="oc-money-v num">{money(figure!)}</span>
              </div>
              <div className="oc-money-sub">{heroSub}</div>
            </>
          ) : (
            <div className="oc-money-mkt">
              <div>
                <div className="oc-money-k">Market order</div>
                <div className="oc-money-note">Fills at the live price{trig}</div>
              </div>
              <span className="oc-qty-chip num">{shares}</span>
            </div>
          )}
        </div>

        <hr className="oc-div" />

        {/* actions */}
        <div className="oc-actions">
          <button className="btn-reject" onClick={() => commit("reject")}>
            Reject
          </button>
          <button className="btn-approve" onClick={() => commit("approve")}>
            Approve
          </button>
        </div>
      </div>
    </div>
  );
}
