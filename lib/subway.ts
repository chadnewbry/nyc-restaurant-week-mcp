// Client-side subway routing over real MTA geometry (public/subway.json):
// nearest-station lookup, direct or one-transfer ride planning, and slicing
// the actual line geometry between two stations so Rick rides the true track.

export interface SubwayStation {
  n: string;
  x: number;
  y: number;
  l: string[];
}

export interface SubwayData {
  lines: Record<string, [number, number][][]>;
  stations: SubwayStation[];
}

export interface RideLeg {
  line: string;
  coords: [number, number][];
  board: string;
  exit: string;
}

export type LngLat = [number, number];

export function haversine(a: LngLat, b: LngLat): number {
  const R = 6371000;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLng = ((b[0] - a[0]) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a[1] * Math.PI) / 180) * Math.cos((b[1] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function nearestStations(data: SubwayData, p: LngLat, maxM: number, count: number) {
  return data.stations
    .map((s) => ({ s, d: haversine(p, [s.x, s.y]) }))
    .filter((e) => e.d <= maxM)
    .sort((a, b) => a.d - b.d)
    .slice(0, count);
}

// Slice the segment of `line` that best covers stations A→B.
function sliceLine(data: SubwayData, line: string, A: SubwayStation, B: SubwayStation): [number, number][] {
  const segs = data.lines[line] ?? [];
  let best: { coords: [number, number][]; score: number } | null = null;
  for (const seg of segs) {
    let ia = 0, ib = 0, da = Infinity, db = Infinity;
    seg.forEach((pt, i) => {
      const dA = haversine(pt as LngLat, [A.x, A.y]);
      const dB = haversine(pt as LngLat, [B.x, B.y]);
      if (dA < da) { da = dA; ia = i; }
      if (dB < db) { db = dB; ib = i; }
    });
    const score = da + db;
    if (!best || score < best.score) {
      const lo = Math.min(ia, ib), hi = Math.max(ia, ib);
      let coords = seg.slice(lo, hi + 1) as [number, number][];
      if (ia > ib) coords = [...coords].reverse();
      best = { coords, score };
    }
  }
  const coords = best && best.coords.length >= 2 ? best.coords : [];
  return [[A.x, A.y], ...coords, [B.x, B.y]];
}

// Plan a ride from `from` to `to`: direct line if any, else one transfer.
// Returns null when the subway doesn't make sense (no nearby stations).
export function planRide(data: SubwayData, from: LngLat, to: LngLat): RideLeg[] | null {
  const near = 900;
  const A = nearestStations(data, from, near, 6);
  const B = nearestStations(data, to, near, 6);
  if (!A.length || !B.length) return null;

  // Direct: one line serving both ends.
  let direct: { legs: RideLeg[]; cost: number } | null = null;
  for (const a of A) {
    for (const b of B) {
      if (a.s === b.s) continue;
      for (const line of a.s.l) {
        if (!b.s.l.includes(line) || !data.lines[line]) continue;
        const cost = a.d + b.d;
        if (!direct || cost < direct.cost) {
          direct = {
            cost,
            legs: [{ line, coords: sliceLine(data, line, a.s, b.s), board: a.s.n, exit: b.s.n }],
          };
        }
      }
    }
  }
  if (direct) return direct.legs;

  // One transfer via a station serving both lines.
  let transfer: { legs: RideLeg[]; cost: number } | null = null;
  for (const a of A.slice(0, 3)) {
    for (const b of B.slice(0, 3)) {
      for (const la of a.s.l) {
        for (const lb of b.s.l) {
          if (la === lb || !data.lines[la] || !data.lines[lb]) continue;
          for (const t of data.stations) {
            if (t === a.s || t === b.s) continue;
            if (!t.l.includes(la) || !t.l.includes(lb)) continue;
            const cost =
              a.d + b.d + haversine([a.s.x, a.s.y], [t.x, t.y]) + haversine([t.x, t.y], [b.s.x, b.s.y]);
            if (!transfer || cost < transfer.cost) {
              transfer = {
                cost,
                legs: [
                  { line: la, coords: sliceLine(data, la, a.s, t), board: a.s.n, exit: t.n },
                  { line: lb, coords: sliceLine(data, lb, t, b.s), board: t.n, exit: b.s.n },
                ],
              };
            }
          }
        }
      }
    }
  }
  return transfer?.legs ?? null;
}
