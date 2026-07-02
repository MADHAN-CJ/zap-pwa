import { useCallback, useEffect, useState } from "react";
import {
  Funds,
  Holding,
  Position,
  getFunds,
  getHoldings,
  getPositions,
} from "@/api/broker";
import { closePosition } from "@/api/dashboard";
import { Spinner, useUI } from "@/components/ui";
import { inr } from "@/lib/format";

function Badge({ product, label }: { product?: string; label?: string }) {
  const p = String(product ?? "").toUpperCase();
  const intraday = p === "INTRADAY" || p === "MIS";
  return <span className={intraday ? "badge intraday" : "badge"}>{label ?? p ?? "—"}</span>;
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="row-between" style={{ padding: "6px 0" }}>
      <span className="dim">{k}</span>
      <span style={{ fontWeight: 600 }}>{v}</span>
    </div>
  );
}

export default function Portfolio() {
  const { toast, confirm } = useUI();
  const [funds, setFunds] = useState<Funds | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [notConnected, setNotConnected] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [f, h, p] = await Promise.all([getFunds(), getHoldings(), getPositions()]);
    // Broker not connected OR Dhan session expired → prompt reconnect. A 409 /
    // BROKER_TOKEN_EXPIRED is NOT a Zap-session problem, so we must NOT log out.
    setNotConnected(
      !f.ok &&
        (f.status === 409 ||
          f.code === "BROKER_TOKEN_EXPIRED" ||
          /not connected|reconnect|session expired/i.test(f.error))
    );
    if (f.ok) setFunds(f.data.funds);
    if (h.ok) setHoldings(h.data.holdings);
    if (p.ok) setPositions(p.data.positions);
    setLoading(false);
  }, []);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const onClose = async (p: Position) => {
    const side = p.netQty > 0 ? "SELL" : "BUY";
    const qty = Math.abs(p.netQty);
    const ok = await confirm({
      title: `Close ${p.tradingSymbol}?`,
      message: `This places a ${side} MARKET order for ${qty} to square off your position.`,
      confirmText: `Close (${side} ${qty})`,
      destructive: true,
    });
    if (!ok) return;
    setClosingId(p.securityId);
    const res = await closePosition({
      securityId: p.securityId,
      exchangeSegment: p.exchangeSegment,
      netQty: p.netQty,
      productType: p.productType,
      symbol: p.tradingSymbol,
    });
    setClosingId(null);
    if (res.ok) {
      toast(
        "success",
        "Submitted",
        `Close order sent to the market (${res.data.order?.status ?? "SUBMITTED"}).`
      );
      load();
    } else {
      toast("error", "Could not close", res.description || res.error);
    }
  };

  if (loading) {
    return (
      <div className="screen">
        <div className="center-fill">
          <Spinner />
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="screen-header" />
      {notConnected && (
        <div className="card" style={{ borderColor: "var(--red)" }}>
          <strong style={{ color: "var(--red)" }}>Reconnect Dhan</strong>
          <p className="dim" style={{ marginTop: 6, marginBottom: 0 }}>
            Your Dhan session has expired or isn't connected. Reconnect in the Broker tab to see your portfolio.
          </p>
        </div>
      )}

      {funds && (
        <div className="card">
          <p className="card-title">Funds</p>
          <div style={{ margin: "10px 0" }}>
            <div className="dim" style={{ fontSize: 12 }}>
              Available
            </div>
            <div style={{ fontSize: 30, fontWeight: 800 }}>{inr(funds.availabelBalance)}</div>
          </div>
          <Row k="Withdrawable" v={inr(funds.withdrawableBalance)} />
          <Row k="Utilized" v={inr(funds.utilizedAmount)} />
          <Row k="Collateral" v={inr(funds.collateralAmount)} />
        </div>
      )}

      <h3 className="section">Holdings</h3>
      {holdings.length === 0 ? (
        <p className="dim">No holdings.</p>
      ) : (
        holdings.map((h) => (
          <div key={h.securityId} className="line-item">
            <div className="sym-row">
              <span style={{ fontSize: 16, fontWeight: 700 }}>{h.tradingSymbol}</span>
              <Badge product="CNC" label="DELIVERY" />
            </div>
            <div className="dim" style={{ marginTop: 2 }}>
              Qty {h.totalQty} · avg {inr(h.avgCostPrice)}
            </div>
          </div>
        ))
      )}

      <h3 className="section">Positions</h3>
      {positions.length === 0 ? (
        <p className="dim">No open positions.</p>
      ) : (
        positions.map((p, i) => {
          const open = p.netQty !== 0;
          return (
            <div key={`${p.securityId}-${i}`} className="line-item">
              <div className="row-between">
                <div style={{ flex: 1 }}>
                  <div className="sym-row">
                    <span style={{ fontSize: 16, fontWeight: 700 }}>{p.tradingSymbol}</span>
                    <Badge product={p.productType} />
                  </div>
                  <div className="dim" style={{ marginTop: 2 }}>
                    {p.positionType} · net {p.netQty}
                  </div>
                </div>
                <span
                  style={{
                    color: p.unrealizedProfit >= 0 ? "var(--green)" : "var(--red)",
                    fontWeight: 700,
                  }}
                >
                  {p.unrealizedProfit >= 0 ? "+" : ""}
                  {inr(p.unrealizedProfit)}
                </span>
              </div>
              {open && (
                <button
                  className="btn ghost-danger"
                  style={{ marginTop: 12, padding: 9 }}
                  onClick={() => onClose(p)}
                  disabled={closingId === p.securityId}
                >
                  {closingId === p.securityId ? (
                    <Spinner />
                  ) : (
                    `Close (${p.netQty > 0 ? "SELL" : "BUY"} ${Math.abs(p.netQty)})`
                  )}
                </button>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
