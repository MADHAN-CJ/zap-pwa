import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { IconChecklist, IconChartPie, IconBrain, IconBuildingBank } from "@tabler/icons-react";
import { haptics } from "@/lib/haptics";
import { isBrokerExpired, subscribeBrokerExpired } from "@/store/broker";

// Bottom tab bar — native iOS-style, Tabler icons.
const TABS = [
  { to: "/orders", label: "Orders", Icon: IconChecklist },
  { to: "/portfolio", label: "Portfolio", Icon: IconChartPie },
  { to: "/analysis", label: "Analysis", Icon: IconBrain },
  { to: "/broker", label: "Broker", Icon: IconBuildingBank },
];

// Persistent "Reconnect Dhan" banner. Dhan access tokens expire every 24h with
// no refresh (access_token / api_key credentials) — any 409 BROKER_TOKEN_EXPIRED
// (or token_expired status) turns this on until a reconnect succeeds. It must
// never log the user out (401 stays Zap-session logout only).
function ReconnectBanner() {
  const navigate = useNavigate();
  const expired = useSyncExternalStore(subscribeBrokerExpired, isBrokerExpired);
  if (!expired) return null;
  return (
    <div
      role="alert"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        margin: "10px 16px 0",
        padding: "10px 14px",
        borderRadius: 12,
        background: "var(--sell-bg)",
        border: "1px solid var(--sell)",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <strong style={{ color: "var(--red)" }}>Dhan session expired</strong>
        <div className="dim" style={{ fontSize: 12, marginTop: 2 }}>
          Dhan tokens last 24 hours. Reconnect to keep trading.
        </div>
      </div>
      <button
        className="pill"
        style={{ background: "var(--red)", color: "#fff", flexShrink: 0 }}
        onClick={() => navigate("/broker")}
      >
        Reconnect Dhan
      </button>
    </div>
  );
}

export default function TabLayout() {
  const { pathname } = useLocation();
  const activeIndex = Math.max(0, TABS.findIndex((t) => t.to === pathname));
  const innerRef = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState({ x: 0, y: 0, w: 0, h: 0 });

  // Measure the active tab so the highlight pill can travel to it smoothly.
  useLayoutEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;
    const measure = () => {
      const el = inner.querySelectorAll<HTMLElement>(".tab")[activeIndex];
      if (el) setPill({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [activeIndex]);

  return (
    <div className="app-shell">
      <ReconnectBanner />
      <main className="app-main">
        <Outlet />
      </main>

      <nav className="tabbar">
        <div className="tabbar-inner" ref={innerRef}>
          <span
            className="tab-pill"
            style={{
              transform: `translateX(${pill.x}px)`,
              width: pill.w,
              top: pill.y,
              height: pill.h,
            }}
          />
          {TABS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => haptics.selection()}
              className={({ isActive }) => (isActive ? "tab active" : "tab")}
            >
              <Icon size={26} stroke={1.9} />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
