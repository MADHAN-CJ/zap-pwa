import type { ReactNode } from "react";
import LogoMark from "@/components/LogoMark";

// Dark-green header band for non-Orders pages. Brand sits top-left with an
// optional action top-right (keeps the header from feeling left-heavy).
export default function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <header className="pageheader">
      <div className="ph-top">
        <div className="ph-brand">
          <LogoMark size={22} />
          <span className="wm">ZapTrade</span>
        </div>
        {action}
      </div>
      <h1 className="ph-title">{title}</h1>
    </header>
  );
}
