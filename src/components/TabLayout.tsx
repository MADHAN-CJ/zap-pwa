import { useLayoutEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { IconChecklist, IconChartPie, IconBuildingBank } from "@tabler/icons-react";
import { haptics } from "@/lib/haptics";

// Bottom tab bar — native iOS-style, Tabler icons.
const TABS = [
  { to: "/orders", label: "Orders", Icon: IconChecklist },
  { to: "/portfolio", label: "Portfolio", Icon: IconChartPie },
  { to: "/broker", label: "Broker", Icon: IconBuildingBank },
];

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
