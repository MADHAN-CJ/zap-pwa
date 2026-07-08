import { useCallback, useEffect, useMemo, useState } from "react";
import { IconChecks } from "@tabler/icons-react";
import ConsoleHeader from "@/components/ConsoleHeader";
import OrderCard, { type Order } from "@/components/OrderCard";
import { useUI } from "@/components/ui";
import { haptics } from "@/lib/haptics";
import type { Draft } from "@/api/orders";
import { confirmAll, confirmOrder, deleteOrder, listPending } from "@/api/dashboard";

// Map a backend DRAFT order to the card's shape. ltp/margin aren't in the order
// payload, so they're left undefined (the card computes order value from price).
// validity/trigger/createdAt render only when present — the card is dynamic.
function toOrder(d: Draft): Order {
  return {
    id: d.id,
    sym: d.symbol,
    exch: d.exchangeSegment ? d.exchangeSegment.split("_")[0] : "NSE",
    side: d.side,
    qty: d.quantity,
    price: d.price,
    type: d.orderType?.toUpperCase() === "MARKET" ? "MARKET" : "LIMIT",
    product: d.productType,
    validity: d.validity,
    trigger: d.triggerPrice,
    createdAt: d.createdAt,
  };
}

export default function Confirm() {
  const { toast } = useUI();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0); // bumped on (re)load so cards remount fresh

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

  const approve = async (o: Order) => {
    const res = await confirmOrder(o.id);
    if (res.ok) {
      toast("success", `Approved ${o.sym}`);
      remove(o.id);
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
      ) : orders.length === 0 ? (
        <div className="oc-empty">
          <div className="ic">
            <IconChecks size={34} stroke={2} />
          </div>
          <h3>All caught up</h3>
          <p>No orders waiting for approval.</p>
        </div>
      ) : (
        <div className="feed">
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
        </div>
      )}
    </div>
  );
}
