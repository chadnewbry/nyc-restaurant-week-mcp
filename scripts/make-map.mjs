// Builds data/nycmap.json — a pixel-grid silhouette of NYC's five boroughs
// rasterized from public borough-boundary GeoJSON. The landing-page map view
// renders this grid as SVG rects (same technique as Rick himself).
// Usage: node scripts/make-map.mjs [path-to-boroughs.geojson]
import { readFileSync, writeFileSync } from "node:fs";

const SRC =
  process.argv[2] ??
  "https://raw.githubusercontent.com/codeforgermany/click_that_hood/main/public/data/new-york-city-boroughs.geojson";

const geo = SRC.startsWith("http")
  ? await (await fetch(SRC)).json()
  : JSON.parse(readFileSync(SRC, "utf8"));

// Collect all polygon rings ([ [lng,lat], ... ]) across all boroughs.
const polys = [];
for (const f of geo.features) {
  const g = f.geometry;
  if (g.type === "Polygon") polys.push(g.coordinates);
  else if (g.type === "MultiPolygon") polys.push(...g.coordinates);
}

// Bounding box with a little padding.
let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
for (const rings of polys)
  for (const [lng, lat] of rings[0]) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
const padLng = (maxLng - minLng) * 0.02;
const padLat = (maxLat - minLat) * 0.02;
minLng -= padLng; maxLng += padLng; minLat -= padLat; maxLat += padLat;

// Grid sized so cells are square in projected space (cos-corrected longitude).
const COLS = 140;
const midLat = ((minLat + maxLat) / 2) * (Math.PI / 180);
const ROWS = Math.round(
  COLS * ((maxLat - minLat) / ((maxLng - minLng) * Math.cos(midLat)))
);

// Ray-casting point-in-polygon honoring holes.
function inRing(lng, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}
function isLand(lng, lat) {
  for (const rings of polys) {
    if (inRing(lng, lat, rings[0])) {
      let inHole = false;
      for (let h = 1; h < rings.length; h++)
        if (inRing(lng, lat, rings[h])) { inHole = true; break; }
      if (!inHole) return true;
    }
  }
  return false;
}

const grid = [];
for (let y = 0; y < ROWS; y++) {
  let row = "";
  const lat = maxLat - ((y + 0.5) / ROWS) * (maxLat - minLat);
  for (let x = 0; x < COLS; x++) {
    const lng = minLng + ((x + 0.5) / COLS) * (maxLng - minLng);
    row += isLand(lng, lat) ? "#" : ".";
  }
  grid.push(row);
}

const out = { cols: COLS, rows: ROWS, bounds: { minLng, maxLng, minLat, maxLat }, grid };
writeFileSync(new URL("../data/nycmap.json", import.meta.url), JSON.stringify(out));
const land = grid.join("").split("#").length - 1;
console.log(`saved ${COLS}x${ROWS} grid, ${land} land cells`);
// Tiny preview
for (let y = 0; y < ROWS; y += 4) {
  let s = "";
  for (let x = 0; x < COLS; x += 2) s += grid[y][x] === "#" ? "█" : " ";
  console.log(s);
}
