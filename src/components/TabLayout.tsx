import { NavLink, Outlet } from "react-router-dom";
import { IconChecklist, IconChartPie, IconBuildingBank } from "@tabler/icons-react";
import { haptics } from "@/lib/haptics";

// Bottom tab bar — native iOS-style, Tabler icons.
const TABS = [
  { to: "/orders", label: "Orders", Icon: IconChecklist },
  { to: "/portfolio", label: "Portfolio", Icon: IconChartPie },
  { to: "/broker", label: "Broker", Icon: IconBuildingBank },
];

export default function TabLayout() {
  // Every page renders its own header band, so there's no shared app bar.
  return (
    <div className="app-shell">
      <main className="app-main">
        <Outlet />
      </main>

      <nav className="tabbar">
        <div className="tabbar-inner">
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
