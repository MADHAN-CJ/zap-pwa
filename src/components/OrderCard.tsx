import { useRef, useState, type PointerEvent } from "react";
import LogoTile from "@/components/LogoTile";
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
  // Not always provided by the order API — shown only when present.
  ltp?: number | null;
  margin?: number | null;
}

const money = (n: number) =>
  "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
        {/* identity + price */}
        <div className="oc-head">
          <div className="oc-id">
            <LogoTile sym={order.sym} />
            <div className="oc-sym">
              <div className="t">{order.sym}</div>
              <div className="sub">
                {order.exch} · {order.type}
              </div>
            </div>
          </div>
          <div className="oc-price">
            <div className="p">
              {order.type === "MARKET" ? "MKT" : order.price != null ? money(order.price) : "—"}
            </div>
            {order.ltp != null ? <div className="ltp">LTP {money(order.ltp)}</div> : null}
          </div>
        </div>

        <hr className="oc-div" />

        {/* transaction */}
        <div className="oc-txn">
          <span className={isBuy ? "side-pill buy" : "side-pill sell"}>{order.side}</span>
          <span className="oc-qty">
            Qty <span className="num">{order.qty}</span>
          </span>
          {figure != null ? (
            <div className="oc-figure">
              <span className="k">{figureLabel}</span>
              <span className="v">{money(figure)}</span>
            </div>
          ) : null}
        </div>

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
