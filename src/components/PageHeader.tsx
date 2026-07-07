import LogoMark from "@/components/LogoMark";

// Simple dark-green header band for pages other than Orders — matches the Orders
// console header's look (brand + blurred deep-green fill) with just a page title.
export default function PageHeader({ title }: { title: string }) {
  return (
    <header className="pageheader">
      <div className="ph-brand">
        <LogoMark size={22} />
        <span className="wm">ZapTrade</span>
      </div>
      <h1 className="ph-title">{title}</h1>
    </header>
  );
}
