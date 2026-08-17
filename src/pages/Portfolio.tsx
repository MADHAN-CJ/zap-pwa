import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { IconCash, IconChartPie, IconShieldHalf, IconRefresh, IconBrain } from "@tabler/icons-react";
import { Funds, Holding, Position, getFunds, getHoldings, getPositions } from "@/api/broker";
import { closePosition } from "@/api/dashboard";
import { Spinner, useUI } from "@/components/ui";
import PageHeader from "@/components/PageHeader";
import LogoTile from "@/components/LogoTile";
import AnalysisStartModal from "@/components/AnalysisStartModal";
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
  if (u === "MARGIN") return "Margin";
  if (u === "MTF") return "MTF";
  return p || "—";
}

// "NSE_EQ" → "NSE", "NSE_FNO" → "NSE F&O"
function prettySegment(seg?: string | null) {
  if (!seg) return "";
  const [exch, kind] = seg.split("_");
  return kind === "FNO" ? `${exch} F&O` : exch;
}

export default function Portfolio() {
  const navigate = useNavigate();
  const { toast, confirm } = useUI();
  const [funds, setFunds] = useState<Funds | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [notConnected, setNotConnected] = useState(false);
  const [closingKey, setClosingKey] = useState<string | null>(null);
  // Position picked for AI analysis (opens the start modal).
  const [analysePos, setAnalysePos] = useState<Position | null>(null);
  const tilt = useDeviceTilt();

  const load = useCallback(async () => {
    const [f, h, p] = await Promise.all([getFunds(), getHoldings(), getPositions()]);
    // Broker not connected OR the Dhan session expired → prompt reconnect. A
    // 409 / BROKER_TOKEN_EXPIRED is NOT a Zap-session problem, so we must NOT
    // log out (the client only logs out on 401).
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

  const posKey = (p: Position) => `${p.exchangeSegment}:${p.securityId}:${p.productType}`;

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
    setClosingKey(posKey(p));
    const res = await closePosition({
      securityId: p.securityId,
      exchangeSegment: p.exchangeSegment,
      netQty: p.netQty,
      productType: p.productType,
      symbol: p.tradingSymbol,
    });
    setClosingKey(null);
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
            <p>
              Your Dhan session has expired (tokens last 24 hours) or isn't connected yet. Reconnect
              in the Broker tab to see your portfolio.
            </p>
            <button className="btn" style={{ marginTop: 10, padding: 10 }} onClick={() => navigate("/broker")}>
              Go to Broker tab
            </button>
          </div>
        )}

        {funds && (
          <div className="funds-hero" style={heroStyle}>
            <div className="funds-label">Available balance</div>
            <div className="funds-amount num">{money0(funds.availabelBalance ?? 0)}</div>
            <div className="funds-cells">
              <div className="fc">
                <IconCash size={17} className="fc-ic" />
                <span className="fc-k">Withdrawable</span>
                <span className="fc-v num">{money0(funds.withdrawableBalance ?? 0)}</span>
              </div>
              <div className="fc">
                <IconChartPie size={17} className="fc-ic" />
                <span className="fc-k">Utilised</span>
                <span className="fc-v num">{money0(funds.utilizedAmount ?? 0)}</span>
              </div>
              <div className="fc">
                <IconShieldHalf size={17} className="fc-ic" />
                <span className="fc-k">Collateral</span>
                <span className="fc-v num">{money0(funds.collateralAmount ?? 0)}</span>
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
                    {h.totalQty} {h.totalQty === 1 ? "share" : "shares"} · avg {money2(h.avgCostPrice)}
                    {h.availableQty !== h.totalQty ? ` · ${h.availableQty} free` : ""} · Delivery
                  </div>
                </div>
                <div className="pf-fig">
                  <div className="pf-fig-v num">{money0(h.avgCostPrice * h.totalQty)}</div>
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
            const key = posKey(p);
            return (
              <div key={`${key}-${i}`} className="pf-item">
                <div className="pf-row">
                  <LogoTile sym={p.tradingSymbol} />
                  <div className="pf-id">
                    <div className="pf-sym">{p.tradingSymbol}</div>
                    {companyName(p.tradingSymbol) && (
                      <div className="pf-name">{companyName(p.tradingSymbol)}</div>
                    )}
                    <div className="pf-sub">
                      {p.positionType} · net {p.netQty} · {prettyProduct(p.productType)}
                      {prettySegment(p.exchangeSegment) ? ` · ${prettySegment(p.exchangeSegment)}` : ""}
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
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="pf-close pf-analyse"
                      style={{ color: "var(--ink)", flex: 1 }}
                      onClick={() => setAnalysePos(p)}
                      aria-label={`Analyse ${p.tradingSymbol} with AI`}
                    >
                      <IconBrain size={16} stroke={2} style={{ verticalAlign: -3, marginRight: 6 }} />
                      Analyse
                    </button>
                    <button
                      className="pf-close"
                      style={{ flex: 1.4 }}
                      onClick={() => onClose(p)}
                      disabled={closingKey === key}
                    >
                      {closingKey === key ? (
                        <Spinner />
                      ) : (
                        `Close · ${p.netQty > 0 ? "SELL" : "BUY"} ${Math.abs(p.netQty)}`
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {analysePos && (
        <AnalysisStartModal
          position={{
            securityId: analysePos.securityId,
            exchangeSegment: analysePos.exchangeSegment,
            tradingSymbol: analysePos.tradingSymbol,
          }}
          onClose={() => setAnalysePos(null)}
          onStarted={() => {
            setAnalysePos(null);
            navigate("/analysis");
          }}
        />
      )}
    </div>
  );
}
