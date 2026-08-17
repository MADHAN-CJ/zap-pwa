import { useState } from "react";
import { logoUrl } from "@/lib/logos";

// Rounded-square company logo. Shows a two-letter monogram, with the real
// logo.dev image layered over it when available (falls back to the monogram if
// the symbol isn't mapped or the image fails to load).
export default function LogoTile({ sym }: { sym: string }) {
  const [failed, setFailed] = useState(false);
  const url = logoUrl(sym);
  const monogram = sym.slice(0, 2).toUpperCase();

  return (
    <div className="logo-tile" aria-hidden="true">
      <span className="mono">{monogram}</span>
      {url && !failed ? <img src={url} alt="" onError={() => setFailed(true)} /> : null}
    </div>
  );
}
