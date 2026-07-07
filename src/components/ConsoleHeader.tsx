import { useEffect, useState } from "react";
import { IconRefresh } from "@tabler/icons-react";
import LogoMark from "@/components/LogoMark";
import { haptics } from "@/lib/haptics";

// "Live console" header band for the Orders screen. Count / split / allocation
// bar are data-driven from the current buy & sell counts.
export default function ConsoleHeader({
  buys,
  sells,
  onRefresh,
  loading,
}: {
  buys: number;
  sells: number;
  onRefresh?: () => void;
  loading?: boolean;
}) {
  const total = buys + sells;
  const buyPct = total ? (buys / total) * 100 : 0;
  const sellPct = total ? (sells / total) * 100 : 0;

  // "Last refresh" ticks upward from mount.
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const ago = secs < 3 ? "just now" : `${secs}s ago`;

  const [spinning, setSpinning] = useState(false);
  const refresh = () => {
    haptics.light();
    setSecs(0);
    setSpinning(true);
    setTimeout(() => setSpinning(false), 650);
    onRefresh?.();
  };

  // Compress the band once the feed is scrolled.
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const scroller = document.querySelector(".app-main");
    if (!scroller) return;
    const onScroll = () => setCompact(scroller.scrollTop > 8);
    scroller.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => scroller.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={compact ? "console compact" : "console"}>
      <div className="console-top">
        <div className="console-brand">
          <LogoMark size={22} />
          <span className="wm">ZapTrade</span>
        </div>
        <button
          type="button"
          className={spinning ? "console-refresh spinning" : "console-refresh"}
          onClick={refresh}
          aria-label="Refresh orders"
        >
          <IconRefresh size={12} stroke={2.2} />
          <span>
            Last refresh · <span className="num">{ago}</span>
          </span>
        </button>
      </div>

      {loading ? (
        <div className="console-main">
          <div className="skeleton on-dark" style={{ width: 150, height: 46 }} />
          <div className="skeleton on-dark" style={{ width: 74, height: 42 }} />
        </div>
      ) : (
        <>
          <div className="console-main">
            <div className="console-count">
              <span className="n">{total}</span>
              <span className="lbl">orders to approve</span>
            </div>
            <div className="console-split">
              <div className="r buy">
                <span className="dot" />
                <span className="num">{buys}</span>&nbsp;buys
              </div>
              <div className="r sell">
                <span className="dot" />
                <span className="num">{sells}</span>&nbsp;sells
              </div>
            </div>
          </div>

          <div className="console-bar">
            <div className="seg buy" style={{ width: `${buyPct}%` }} />
            <div className="seg sell" style={{ width: `${sellPct}%` }} />
          </div>
        </>
      )}
    </header>
  );
}
