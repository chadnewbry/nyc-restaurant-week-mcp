"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Rick } from "../rick";
import { BIKE, CAB, CHEF, RAT_RUN, Sprite } from "./sprites";

export interface MapPin {
  slug: string;
  name: string;
  lat: number;
  lng: number;
  location: string;
  cuisines: string[];
  offers: string;
  address: string | null;
  maps: string;
  menuUrl: string | null;
  opentable: string | null;
  website: string | null;
  image: string | null;
}

export interface NycMap {
  cols: number;
  rows: number;
  bounds: { minLng: number; maxLng: number; minLat: number; maxLat: number };
  grid: string[];
}

interface XY {
  x: number;
  y: number;
}

type Vehicle = "walk" | "bike" | "cab";
type Mode = Vehicle | "chef" | "idle";

interface Journey {
  pin: MapPin & XY;
  tx: number;
  ty: number;
  phase: "h" | "v";
  speed: number;
}

const LABELS = [
  { name: "the bronx", x: 96, y: 16 },
  { name: "manhattan", x: 44, y: 38 },
  { name: "queens", x: 116, y: 56 },
  { name: "brooklyn", x: 84, y: 100 },
  { name: "staten island", x: 26, y: 116 },
];

const VERB: Record<Vehicle, (name: string) => string> = {
  walk: (n) => `rick scurries over to ${n}...`,
  bike: (n) => `rick hops on a citibike → ${n}`,
  cab: (n) => `rick hails a cab → ${n}`,
};

// Merge each grid row's land cells into horizontal run rects (fewer DOM nodes).
function landRects(map: NycMap) {
  const rects: Array<{ x: number; y: number; w: number }> = [];
  map.grid.forEach((row, y) => {
    let start = -1;
    for (let x = 0; x <= row.length; x++) {
      const land = x < row.length && row[x] === "#";
      if (land && start === -1) start = x;
      if (!land && start !== -1) {
        rects.push({ x: start, y, w: x - start });
        start = -1;
      }
    }
  });
  return rects;
}

export function MapView({ pins, map }: { pins: MapPin[]; map: NycMap }) {
  const { bounds, cols, rows } = map;

  const located = useMemo(
    () =>
      pins.map((p) => ({
        ...p,
        x: ((p.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * cols,
        y: ((bounds.maxLat - p.lat) / (bounds.maxLat - bounds.minLat)) * rows,
      })),
    [pins, bounds, cols, rows]
  );

  const land = useMemo(() => landRects(map), [map]);

  const [q, setQ] = useState("");
  const [focus, setFocus] = useState<(MapPin & XY) | null>(null);
  const [mode, setMode] = useState<Mode>("idle");
  const [frame, setFrame] = useState(0);
  const [flip, setFlip] = useState(false);
  const [status, setStatus] = useState("rick is sniffing the night air...");

  const posRef = useRef<XY>({ x: 71, y: 48 }); // start in manhattan
  const journeyRef = useRef<Journey | null>(null);
  const rickRef = useRef<SVGGElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusRef = useRef<(MapPin & XY) | null>(null);

  const matched = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return null;
    return located.filter((p) =>
      `${p.name} ${p.cuisines.join(" ")} ${p.location} ${p.offers}`.toLowerCase().includes(term)
    );
  }, [q, located]);
  const matchedSlugs = useMemo(() => (matched ? new Set(matched.map((p) => p.slug)) : null), [matched]);

  const startJourney = useCallback((pin: MapPin & XY) => {
    const p = posRef.current;
    const dist = Math.abs(pin.x - p.x) + Math.abs(pin.y - p.y);
    if (dist < 0.5) {
      setMode("chef");
      setStatus(`rick's cooking at ${pin.name.toLowerCase()}`);
      return;
    }
    const vehicle: Vehicle = dist < 14 ? "walk" : dist < 42 ? "bike" : "cab";
    journeyRef.current = {
      pin,
      tx: pin.x,
      ty: pin.y,
      phase: Math.random() < 0.5 ? "h" : "v",
      speed: vehicle === "walk" ? 9 : vehicle === "bike" ? 20 : 36,
    };
    setMode(vehicle);
    setStatus(VERB[vehicle](pin.name.toLowerCase()));
  }, []);

  const randomPin = useCallback(
    () => located[Math.floor(Math.random() * located.length)],
    [located]
  );

  // Main animation loop — position is updated imperatively so React only
  // re-renders on mode/frame changes, not 60×/second.
  useEffect(() => {
    let raf: number;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const j = journeyRef.current;
      if (j) {
        const p = posRef.current;
        const step = j.speed * dt;
        const moveAxis = (axis: "x" | "y"): boolean => {
          const target = axis === "x" ? j.tx : j.ty;
          const d = target - p[axis];
          if (axis === "x" && Math.abs(d) > 0.01) setFlip(d < 0);
          if (Math.abs(d) <= step) {
            p[axis] = target;
            return true;
          }
          p[axis] += Math.sign(d) * step;
          return false;
        };
        const order: Array<"x" | "y"> = j.phase === "h" ? ["x", "y"] : ["y", "x"];
        if (moveAxis(order[0]) && moveAxis(order[1])) {
          journeyRef.current = null;
          setMode("chef");
          setStatus(`rick's cooking at ${j.pin.name.toLowerCase()}`);
          if (!focusRef.current) {
            timerRef.current = setTimeout(() => startJourney(randomPin()), 3400);
          }
        }
      }
      const p = posRef.current;
      rickRef.current?.setAttribute("transform", `translate(${p.x} ${p.y})`);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [startJourney, randomPin]);

  // Kick off the idle roam.
  useEffect(() => {
    timerRef.current = setTimeout(() => startJourney(randomPin()), 1200);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [startJourney, randomPin]);

  // Focus changes redirect Rick immediately.
  useEffect(() => {
    focusRef.current = focus;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (focus) {
      startJourney(focus);
    } else {
      timerRef.current = setTimeout(() => startJourney(randomPin()), 1800);
    }
  }, [focus, startJourney, randomPin]);

  // Leg/pedal animation while moving.
  useEffect(() => {
    if (mode !== "walk" && mode !== "bike") return;
    const t = setInterval(() => setFrame((f) => f ^ 1), 150);
    return () => clearInterval(t);
  }, [mode]);

  const sprite =
    mode === "walk" || mode === "idle"
      ? { grid: RAT_RUN[frame], scale: 0.45 }
      : mode === "bike"
        ? { grid: BIKE[frame], scale: 0.5 }
        : mode === "cab"
          ? { grid: CAB[0], scale: 0.5 }
          : { grid: CHEF[0], scale: 0.55 };

  return (
    <div className="map-page wrap">
      <div className="ask-head">
        <Rick size={56} />
        <div className="ask-title">rick&apos;s map</div>
      </div>
      <div className="ask-sub">
        {located.length} spots pinned. <a href="/">[ ask rick ]</a>
      </div>

      <form
        className="term-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (matched?.length) setFocus(matched[0]);
        }}
      >
        <input
          className="term-input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="find a spot... (name, cuisine, neighborhood)"
          aria-label="Search restaurants on the map"
        />
        <button className="term-send" type="submit" disabled={!matched?.length}>
          go
        </button>
      </form>

      {matched && (
        <div className="map-results">
          {matched.length === 0 ? (
            <div className="line sys">no spots match. rick suggests trying &quot;pizza&quot;.</div>
          ) : (
            matched.slice(0, 6).map((p) => (
              <button key={p.slug} className="example" onClick={() => setFocus(p)}>
                {p.name.toLowerCase()} · {p.location.toLowerCase()}
              </button>
            ))
          )}
        </div>
      )}

      <div className="line sys map-status">{status}</div>

      <svg
        className="nyc-svg"
        viewBox={`0 0 ${cols} ${rows}`}
        shapeRendering="crispEdges"
        role="img"
        aria-label="Pixel map of New York City with restaurant pins"
      >
        {land.map((r, i) => (
          <rect key={i} className="land" x={r.x} y={r.y} width={r.w} height="1" />
        ))}
        {LABELS.map((l) => (
          <text key={l.name} className="boro-label" x={l.x} y={l.y}>
            {l.name}
          </text>
        ))}
        {located.map((p) => (
          <rect
            key={p.slug}
            className={`pin${focus?.slug === p.slug ? " focused" : ""}${
              matchedSlugs && !matchedSlugs.has(p.slug) ? " dimmed" : ""
            }`}
            x={p.x - 0.6}
            y={p.y - 0.6}
            width="1.2"
            height="1.2"
            onClick={() => setFocus(p)}
          >
            <title>{p.name}</title>
          </rect>
        ))}
        <g ref={rickRef}>
          <Sprite grid={sprite.grid} x={0} y={0} scale={sprite.scale} flip={flip} />
        </g>
      </svg>

      {focus && (
        <div className="map-focus">
          <div className="ccard">
            {focus.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="photo" src={focus.image} alt={focus.name} loading="lazy" />
            ) : null}
            <div className="n">{focus.name}</div>
            <div className="m">
              {focus.address ? `${focus.address} · ` : ""}
              {focus.location}
              {focus.cuisines.length ? ` · ${focus.cuisines.join(", ")}` : ""}
            </div>
            <div className="o">{focus.offers}</div>
            <div className="links">
              {focus.opentable ? <a href={focus.opentable} target="_blank" rel="noreferrer">reserve</a> : null}
              {focus.menuUrl ? <a href={focus.menuUrl} target="_blank" rel="noreferrer">menu</a> : null}
              {focus.website ? <a href={focus.website} target="_blank" rel="noreferrer">site</a> : null}
              <a href={focus.maps} target="_blank" rel="noreferrer">maps</a>
            </div>
          </div>
          <button className="example roam" onClick={() => setFocus(null)}>
            let rick roam free
          </button>
        </div>
      )}
    </div>
  );
}
