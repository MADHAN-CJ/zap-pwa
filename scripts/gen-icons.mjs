// Regenerates the PWA icons from the master app icon in `scripts/app-icon.png`
// (the finished green Zap mark on the light rounded tile, 2048×2048).
//
// Downscales with macOS `sips` — no external npm deps. On other platforms,
// resize scripts/app-icon.png to the same sizes with any image tool.
import { execFileSync } from "node:child_process";
import { copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "scripts", "app-icon.png");
const OUT = join(ROOT, "public");

// size (px) → output filename. 180 is the iOS apple-touch-icon.
const TARGETS = [
  [512, "pwa-512.png"],
  [192, "pwa-192.png"],
  [180, "apple-touch-icon.png"],
];

for (const [size, name] of TARGETS) {
  const dest = join(OUT, name);
  copyFileSync(SRC, dest);
  execFileSync("sips", ["-Z", String(size), dest], { stdio: "ignore" });
  console.log(`wrote public/${name} (${size}x${size})`);
}
console.log("done. favicon.svg is a hand-authored vector — not regenerated here.");
