import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { IconCash, IconChartPie, IconShieldHalf, IconRefresh } from "@tabler/icons-react";
import { Funds, Holding, Position, getFunds, getHoldings, getPositions } from "@/api/broker";
import { closePosition } from "@/api/dashboard";
import { Spinner, useUI } from "@/components/ui";
import PageHeader from "@/components/PageHeader";
import LogoTile from "@/components/LogoTile";
import { companyName } from "@/lib/logos";
import { useDeviceTilt } from "@/lib/useDeviceTilt";

const money0 = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
const money2 = (n: number) =>
  "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pnl = (n: number) => (n >= 0 ? "+" : "−") + "₹" + Math.round(Math.abs(n)).toLocaleString("en-IN");

function prettyProduct(p: string) {
  const u = (p || "").toUpperCase();
  if (u === "INTRADAY" || u === "MIS") return "Intraday";
  if (u === "CNC" || u === "DELIVERY") return "Delivery";
  return p || "—";
}

export default function Portfolio() {
  const { toast, confirm } = useUI();
  const [funds, setFunds] = useState<Funds | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [notConnected, setNotConnected] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);
  const tilt = useDeviceTilt();

  const load = useCallback(async () => {
    const [f, h, p] = await Promise.all([getFunds(), getHoldings(), getPositions()]);
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
      toast("success", "Submitted", `Close order sent to the market.`);
      load();
    } else {
      toast("error", "Could not close", res.description || res.error);
    }
  };

  const refreshBtn = (
    <button className="ph-action" onClick={load} aria-label="Refresh portfolio">
      <IconRefresh size={17} stroke={2} />
    </button>
  );

  if (loading) {
    return (
      <div className="page">
        <PageHeader title="Portfolio" action={refreshBtn} />
        <div className="screen">
          <div className="skeleton" style={{ height: 168, borderRadius: 16, marginBottom: 24 }} />
          <div className="skeleton" style={{ width: 110, height: 20, margin: "0 0 12px" }} />
          {[0, 1].map((i) => (
            <div key={i} className="pf-item">
              <div className="pf-row">
                <div className="skeleton" style={{ width: 42, height: 42, borderRadius: 12 }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton" style={{ width: 130, height: 17, marginBottom: 8 }} />
                  <div className="skeleton" style={{ width: 96, height: 12 }} />
                </div>
                <div className="skeleton" style={{ width: 74, height: 17 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // motion-reactive shadow + specular highlight for the funds hero
  const heroStyle: CSSProperties = {
    boxShadow: `${(-tilt.x * 9).toFixed(1)}px ${(15 - tilt.y * 5).toFixed(1)}px 34px -16px rgba(0, 38, 16, 0.55)`,
    "--hl-x": `${(50 + tilt.x * 34).toFixed(0)}%`,
    "--hl-y": `${(32 + tilt.y * 28).toFixed(0)}%`,
  } as CSSProperties;

  return (
    <div className="page">
      <PageHeader title="Portfolio" action={refreshBtn} />
      <div className="screen">
        {notConnected && (
          <div className="reconnect-card">
            <strong>Reconnect Dhan</strong>
            <p>Your Dhan session has expired or isn't connected. Reconnect in the Broker tab to see your portfolio.</p>
          </div>
        )}

        {funds && (
          <div className="funds-hero" style={heroStyle}>
            <div className="funds-label">Available balance</div>
            <div className="funds-amount num">{money0(funds.availabelBalance)}</div>
            <div className="funds-cells">
              <div className="fc">
                <IconCash size={17} className="fc-ic" />
                <span className="fc-k">Withdrawable</span>
                <span className="fc-v num">{money0(funds.withdrawableBalance)}</span>
              </div>
              <div className="fc">
                <IconChartPie size={17} className="fc-ic" />
                <span className="fc-k">Utilised</span>
                <span className="fc-v num">{money0(funds.utilizedAmount)}</span>
              </div>
              <div className="fc">
                <IconShieldHalf size={17} className="fc-ic" />
                <span className="fc-k">Collateral</span>
                <span className="fc-v num">{money0(funds.collateralAmount)}</span>
              </div>
            </div>
          </div>
        )}

        <h3 className="section">Holdings</h3>
        {holdings.length === 0 ? (
          <p className="pf-empty">No holdings.</p>
        ) : (
          holdings.map((h) => (
            <div key={h.securityId} className="pf-item">
              <div className="pf-row">
                <LogoTile sym={h.tradingSymbol} />
                <div className="pf-id">
                  <div className="pf-sym">{h.tradingSymbol}</div>
                  {companyName(h.tradingSymbol) && (
                    <div className="pf-name">{companyName(h.tradingSymbol)}</div>
                  )}
                  <div className="pf-sub">
                    {h.totalQty} shares · avg {money2(h.avgCostPrice)}
                  </div>
                </div>
                <div className="pf-fig">
                  <div className="pf-fig-v num">{money0(h.totalQty * h.avgCostPrice)}</div>
                  <div className="pf-fig-k">invested</div>
                </div>
              </div>
            </div>
          ))
        )}

        <h3 className="section" style={{ marginTop: 24 }}>
          Positions
        </h3>
        {positions.length === 0 ? (
          <p className="pf-empty">No open positions.</p>
        ) : (
          positions.map((p, i) => {
            const open = p.netQty !== 0;
            const up = p.unrealizedProfit >= 0;
            return (
              <div key={`${p.securityId}-${i}`} className="pf-item">
                <div className="pf-row">
                  <LogoTile sym={p.tradingSymbol} />
                  <div className="pf-id">
                    <div className="pf-sym">{p.tradingSymbol}</div>
                    {companyName(p.tradingSymbol) && (
                      <div className="pf-name">{companyName(p.tradingSymbol)}</div>
                    )}
                    <div className="pf-sub">
                      net {p.netQty} · {prettyProduct(p.productType)}
                    </div>
                  </div>
                  <div className="pf-fig">
                    <div className={up ? "pf-fig-v num up" : "pf-fig-v num down"}>
                      {pnl(p.unrealizedProfit)}
                    </div>
                    <div className="pf-fig-k">unrealised P&amp;L</div>
                  </div>
                </div>
                {open && (
                  <button className="pf-close" onClick={() => onClose(p)} disabled={closingId === p.securityId}>
                    {closingId === p.securityId ? (
                      <Spinner />
                    ) : (
                      `Close · ${p.netQty > 0 ? "SELL" : "BUY"} ${Math.abs(p.netQty)}`
                    )}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
