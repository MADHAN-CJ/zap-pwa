import { motion } from "motion/react";
import { useLocation, useNavigate } from "react-router-dom";
import { IconEye, IconMoonStars } from "@tabler/icons-react";
import { spring, pressScale } from "@/lib/motion";
import { selectHaptic } from "@/lib/haptics";

const TABS = [
  { route: "/watch", label: "Home", Icon: IconEye },
  { route: "/digest", label: "Digest", Icon: IconMoonStars },
];

/** Floating frosted tab bar — Home / Digest. Content scrolls under it. */
export function TabBar() {
  const { pathname } = useLocation();
  const nav = useNavigate();
  return (
    <nav
      style={{
        position: "fixed",
        left: "50%",
        transform: "translateX(-50%)",
        bottom: "calc(var(--safe-bottom) + 14px)",
        display: "flex",
        gap: 4,
        padding: 5,
        borderRadius: "var(--radius-full)",
        background: "color-mix(in srgb, var(--surface) 82%, transparent)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        boxShadow: "var(--shadow)",
        border: "1px solid var(--line)",
        zIndex: 40,
      }}
    >
      {TABS.map(({ route, label, Icon }) => {
        const active = pathname === route || (route === "/watch" && pathname === "/");
        return (
          <motion.button
            key={route}
            whileTap={{ scale: pressScale }}
            transition={spring}
            onClick={() => {
              selectHaptic();
              nav(route);
            }}
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "9px 18px",
              borderRadius: "var(--radius-full)",
              color: active ? "var(--brand-ink)" : "var(--ink-2)",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {active && (
              <motion.span
                layoutId="tab-pill"
                transition={spring}
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "var(--radius-full)",
                  background: "var(--brand)",
                }}
              />
            )}
            <span style={{ position: "relative", display: "flex", alignItems: "center", gap: 7 }}>
              <Icon size={17} stroke={2.2} />
              {label}
            </span>
          </motion.button>
        );
      })}
    </nav>
  );
}
