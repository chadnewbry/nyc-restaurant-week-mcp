// Builds public/subway.json — real NYC subway geometry for the map page:
// line geometries from MTA Subway Service Lines (data.ny.gov s692-irgq) and
// stations with served routes from MTA Subway Stations (39hk-dx4f).
// Usage: npm run subway
import { writeFileSync } from "node:fs";

const LINES_URL = "https://data.ny.gov/api/views/s692-irgq/rows.geojson?accessType=DOWNLOAD";
const STATIONS_URL = "https://data.ny.gov/resource/39hk-dx4f.json?$limit=2000";

// Collapse peak/shuttle service variants onto their base route ids.
const SERVICE_MAP = { "5 Peak": "5", SF: "S", SR: "S", ST: "S" };

// Douglas-Peucker simplification (~10 m tolerance) — invisible at map scale
// but cuts the payload ~10x.
const TOL = 0.0001;
function simplify(pts) {
  if (pts.length <= 2) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  let maxD = 0, maxI = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const t = dx || dy ? ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy) : 0;
    const c = Math.max(0, Math.min(1, t));
    const d = Math.hypot(x - (a[0] + c * dx), y - (a[1] + c * dy));
    if (d > maxD) { maxD = d; maxI = i; }
  }
  if (maxD <= TOL) return [a, b];
  return [...simplify(pts.slice(0, maxI + 1)).slice(0, -1), ...simplify(pts.slice(maxI))];
}

const linesGeo = await (await fetch(LINES_URL)).json();
const lines = {};
for (const f of linesGeo.features) {
  let id = (f.properties.service ?? "").trim();
  id = SERVICE_MAP[id] ?? id;
  if (!id) continue;
  const segs =
    f.geometry.type === "MultiLineString" ? f.geometry.coordinates : [f.geometry.coordinates];
  const rounded = segs.map((seg) =>
    simplify(seg.map(([x, y]) => [+x.toFixed(5), +y.toFixed(5)]))
  );
  (lines[id] ??= []).push(...rounded);
}

const stationsRaw = await (await fetch(STATIONS_URL)).json();
const stations = stationsRaw
  .filter((s) => s.gtfs_latitude && s.gtfs_longitude)
  .map((s) => ({
    n: s.stop_name,
    x: +(+s.gtfs_longitude).toFixed(5),
    y: +(+s.gtfs_latitude).toFixed(5),
    l: (s.daytime_routes ?? "").split(/\s+/).filter(Boolean),
  }));

writeFileSync(
  new URL("../public/subway.json", import.meta.url),
  JSON.stringify({ lines, stations })
);
console.log(
  `saved ${Object.keys(lines).length} lines (${Object.keys(lines).sort().join(" ")}), ${stations.length} stations`
);
