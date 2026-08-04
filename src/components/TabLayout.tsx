import { NavLink, Outlet } from "react-router-dom";

// Monochrome glyph tab icons — same set as the Expo app (no icon-font dep).
const TABS = [
  { to: "/orders", label: "Confirm", glyph: "✓" },
  { to: "/portfolio", label: "Portfolio", glyph: "▦" },
  { to: "/analysis", label: "Analysis", glyph: "◎" },
  { to: "/broker", label: "Broker", glyph: "⇄" },
];

export default function TabLayout() {
  return (
    <div className="app-shell">
      <Outlet />
      <nav className="tabbar">
        <div className="tabbar-inner">
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) => (isActive ? "tab active" : "tab")}
            >
              <span className="glyph">{t.glyph}</span>
              <span>{t.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
