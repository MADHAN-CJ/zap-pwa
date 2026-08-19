import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { IconChevronLeft } from "@tabler/icons-react";
import { springScreen, pressScale, spring } from "@/lib/motion";
import { tapHaptic } from "@/lib/haptics";
import type { ReactNode } from "react";

/** Page wrapper: safe areas, optional back header, liquid slide-in. */
export function Screen({
  title,
  tag,
  back,
  children,
  padBottom = true,
}: {
  title?: string;
  /** Small right-aligned tag, e.g. position symbol or "confirm". */
  tag?: ReactNode;
  /** Route to go back to; renders the chevron when set. */
  back?: string;
  children: ReactNode;
  /** Leave room for the tab bar / input bar. */
  padBottom?: boolean;
}) {
  const nav = useNavigate();
  return (
    <motion.div
      initial={{ opacity: 0, x: back ? 28 : 0, y: back ? 0 : 10 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={springScreen}
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        paddingTop: "calc(var(--safe-top) + 10px)",
        paddingBottom: padBottom ? "calc(var(--safe-bottom) + 96px)" : "var(--safe-bottom)",
      }}
    >
      {(title || back || tag) && (
        <header
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 16px 14px",
          }}
        >
          {back && (
            <motion.button
              whileTap={{ scale: pressScale }}
              transition={spring}
              onClick={() => {
                tapHaptic();
                nav(back);
              }}
              aria-label="Back"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 36,
                height: 36,
                borderRadius: "var(--radius-full)",
                background: "var(--surface)",
                boxShadow: "var(--shadow)",
                color: "var(--ink)",
                marginLeft: -4,
              }}
            >
              <IconChevronLeft size={20} stroke={2.2} />
            </motion.button>
          )}
          {title && (
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.4, flex: 1 }}>
              {title}
            </h1>
          )}
          {!title && <div style={{ flex: 1 }} />}
          {tag && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--ink-2)",
                background: "var(--surface-2)",
                padding: "4px 10px",
                borderRadius: "var(--radius-full)",
                whiteSpace: "nowrap",
              }}
            >
              {tag}
            </span>
          )}
        </header>
      )}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "0 16px" }}>
        {children}
      </div>
    </motion.div>
  );
}
