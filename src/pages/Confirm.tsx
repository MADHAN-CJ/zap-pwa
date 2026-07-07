import { useMemo, useState } from "react";
import { IconChecks } from "@tabler/icons-react";
import ConsoleHeader from "@/components/ConsoleHeader";
import OrderCard, { type Order } from "@/components/OrderCard";
import { useUI } from "@/components/ui";
import { haptics } from "@/lib/haptics";

// Realistic NSE seed orders (3 buys / 2 sells). Structured to match the Zap Trade
// order list so live data can replace this later; only the display fields differ.
const SEED: Order[] = [
  { id: "1", sym: "RELIANCE", exch: "NSE", side: "BUY", qty: 5, price: 2940.5, ltp: 2952.1, type: "LIMIT", margin: 14702.5 },
  { id: "2", sym: "INFY", exch: "NSE", side: "SELL", qty: 15, price: 1585.0, ltp: 1578.4, type: "LIMIT", margin: 23775.0 },
  { id: "3", sym: "TCS", exch: "NSE", side: "BUY", qty: 3, price: 0, ltp: 3410.25, type: "MARKET", margin: 10230.75 },
  { id: "4", sym: "HDFCBANK", exch: "NSE", side: "BUY", qty: 10, price: 1655.0, ltp: 1662.3, type: "LIMIT", margin: 16550.0 },
  { id: "5", sym: "TATAMOTORS", exch: "NSE", side: "SELL", qty: 20, price: 965.75, ltp: 970.2, type: "LIMIT", margin: 19315.0 },
];

export default function Confirm() {
  const { toast } = useUI();
  const [orders, setOrders] = useState<Order[]>(SEED);

  const { buys, sells } = useMemo(
    () => ({
      buys: orders.filter((o) => o.side === "BUY").length,
      sells: orders.filter((o) => o.side === "SELL").length,
    }),
    [orders]
  );

  const remove = (id: string) => setOrders((os) => os.filter((o) => o.id !== id));

  const approve = (o: Order) => {
    toast("success", `Approved ${o.sym}`);
    remove(o.id);
  };
  const reject = (o: Order) => {
    toast("info", `Rejected ${o.sym}`);
    remove(o.id);
  };
  const approveAll = () => {
    const n = orders.length;
    if (!n) return;
    haptics.success();
    setOrders([]);
    toast("success", `Approved all ${n} orders`);
  };

  // Placeholder refresh — reloads the queue. Swap for a live re-fetch of the
  // order list once it's wired to the backend.
  const refresh = () => setOrders(SEED);

  return (
    <div className="orders">
      <ConsoleHeader buys={buys} sells={sells} onRefresh={refresh} />

      {orders.length === 0 ? (
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
              key={o.id}
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
