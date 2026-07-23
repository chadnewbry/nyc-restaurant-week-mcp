// Builds Rick's subway car sprites from the CC0 source art in scripts/assets.
//
// Source: "2D Train/Tram/Carriage" by Chasersgaming (OpenGameArt, CC0)
// https://opengameart.org/content/2d-traintramcarriege
//
// We trim it, crop the pantograph off the roof (NYC runs third rail), shrink it
// to marker size with nearest-neighbour so it stays crisp, and repaint it in the
// site palette — cream body, dark windows, with the waist band tinted to each
// MTA route color. One PNG per distinct line color lands in public/sprites/subway/.
//
// Regenerate with `npm run subway-sprites`; the output is committed, so this
// only needs to run if the source art or the palette changes.
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const WIDTH = 50; // rendered at 2x in map-view — a bit wider than the taxi

// Same values as LINE_COLORS in app/map/map-view.tsx, deduped, plus the
// fallback grey used for lines that aren't in that table.
const COLORS = [
  "EE352E", "00933C", "B933AD", "0039A6", "FF6319",
  "6CBE45", "996633", "A7A9AC", "FCCC0A", "808183",
];

const CREAM = [242, 233, 220];
const CREAM_DIM = [206, 197, 184];
const WINDOW = [18, 16, 12];
const WINDOW_DARK = [10, 9, 8];
const TRUCK = [74, 68, 58]; // light enough that the wheels read against the map

function tint(hex, mul) {
  const n = parseInt(hex, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.round(c * mul));
}

const src = fileURLToPath(new URL("assets/subway-car-cc0.png", import.meta.url));
const outDir = fileURLToPath(new URL("../public/sprites/subway/", import.meta.url));
mkdirSync(outDir, { recursive: true });

const trimmed = await sharp(src).trim({ threshold: 0 }).raw().toBuffer({ resolveWithObject: true });
const { width: tw, height: th, channels } = trimmed.info;

// The roof is the first row the car spans end to end; everything above it is
// the trolley pole.
let top = 0;
for (let y = 0; y < th; y++) {
  let n = 0;
  for (let x = 0; x < tw; x++) if (trimmed.data[(y * tw + x) * channels + 3] > 10) n++;
  if (n > tw * 0.9) {
    top = y;
    break;
  }
}

const bodyH = th - top;
const height = Math.round((bodyH * WIDTH) / tw);
const small = await sharp(trimmed.data, { raw: { width: tw, height: th, channels } })
  .extract({ left: 0, top, width: tw, height: bodyH })
  .resize(WIDTH, height, { kernel: "nearest" })
  .ensureAlpha()
  .raw()
  .toBuffer();

for (const hex of COLORS) {
  const band = tint(hex, 1);
  const bandDark = tint(hex, 0.62);
  const out = Buffer.from(small);
  for (let i = 0; i < out.length; i += 4) {
    const [r, b, a] = [out[i], out[i + 2], out[i + 3]];
    if (a < 10) continue;
    let px;
    if (b - r >= 8) {
      px = r > 5 ? band : bandDark; // navy waist band (two shades)
    } else if (r >= 220) {
      px = CREAM;
    } else if (r >= 200) {
      px = CREAM_DIM;
    } else if (r >= 160) {
      px = WINDOW;
    } else if (r >= 120) {
      px = WINDOW_DARK;
    } else {
      px = TRUCK; // wheels + trucks
    }
    [out[i], out[i + 1], out[i + 2]] = px;
  }
  await sharp(out, { raw: { width: WIDTH, height, channels: 4 } })
    .png()
    .toFile(`${outDir}${hex}.png`);
}

console.log(`wrote ${COLORS.length} subway sprites (${WIDTH}x${height}) to public/sprites/subway/`);
