// Zero-dependency PNG icon generator for the PWA.
// Draws the Zap lightning bolt (accent yellow) on the dark app background,
// with rounded corners, at the sizes the manifest needs. Uses only node:zlib.
import zlib from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
mkdirSync(OUT, { recursive: true });

const BG = [11, 15, 23, 255]; // #0b0f17
const FG = [250, 204, 21, 255]; // #facc15
const TRANSPARENT = [0, 0, 0, 0];

// Lightning bolt polygon in a 512x512 coordinate space (matches favicon.svg).
const BOLT = [
  [300, 96],
  [168, 288],
  [244, 288],
  [212, 416],
  [360, 208],
  [280, 208],
];

function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  // 10-12 = compression/filter/interlace = 0
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

// Render at `size`, 3x supersampled for smooth edges. `rounded` clips corners;
// `maskable` skips rounding (safe zone handled by the OS mask) and pads the bolt.
function render(size, { rounded = true } = {}) {
  const ss = 3;
  const S = size * ss;
  const radius = rounded ? S * 0.22 : 0;
  const acc = new Float32Array(size * size * 4);

  const inRounded = (x, y) => {
    if (!rounded) return true;
    const rx = Math.min(x, S - x);
    const ry = Math.min(y, S - y);
    if (rx >= radius || ry >= radius) return true;
    const dx = radius - rx;
    const dy = radius - ry;
    return dx * dx + dy * dy <= radius * radius;
  };

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      let px;
      if (!inRounded(x, y)) {
        px = TRANSPARENT;
      } else {
        // map to 512 bolt space
        const bx = (x / S) * 512;
        const by = (y / S) * 512;
        px = pointInPoly(bx, by, BOLT) ? FG : BG;
      }
      const oi = (Math.floor(y / ss) * size + Math.floor(x / ss)) * 4;
      acc[oi] += px[0];
      acc[oi + 1] += px[1];
      acc[oi + 2] += px[2];
      acc[oi + 3] += px[3];
    }
  }

  const out = Buffer.alloc(size * size * 4);
  const n = ss * ss;
  for (let i = 0; i < size * size * 4; i++) out[i] = Math.round(acc[i] / n);
  return encodePng(size, size, out);
}

writeFileSync(join(OUT, "pwa-192.png"), render(192));
writeFileSync(join(OUT, "pwa-512.png"), render(512));
writeFileSync(join(OUT, "apple-touch-icon.png"), render(180, { rounded: false }));
console.log("icons written to public/: pwa-192.png, pwa-512.png, apple-touch-icon.png");
