"use client";

import {
  LngLatBounds,
  Map as MLMap,
  Marker,
  NavigationControl,
  Popup,
  setWorkerUrl,
  type MapLayerMouseEvent,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MAP_STYLE } from "@/lib/map-style";
import { haversine, planRide, type LngLat, type SubwayData } from "@/lib/subway";
import { Rick } from "../rick";

// ---- marker sprites -------------------------------------------------------
// Rat: Downloads sprite sheet (48px grid; white rat = columns 9-11, side-walk
// frames on rows 1-2, top-down idle on row 0). Faces LEFT natively.
// Vehicles: Kenney Pixel Vehicle Pack (CC0). Face RIGHT natively.
// Subway car: "2D Train/Tram/Carriage" by Chasersgaming (OpenGameArt, CC0),
// repainted per route color by scripts/make-subway-sprites.mjs.
const RAT_COL0 = 9; // white variant
const HAT_SVG = `<svg class="hat" width="22" height="16" viewBox="0 0 11 8" shape-rendering="crispEdges"><rect x="2" y="0" width="7" height="2" fill="#f2e9dc"/><rect x="1" y="2" width="9" height="2" fill="#f2e9dc"/><rect x="2" y="4" width="7" height="3" fill="#f2e9dc"/><rect x="2" y="7" width="7" height="1" fill="#b5aa9a"/></svg>`;

function ratWalkHTML(frame: number, movingLeft: boolean, opacity = 1): string {
  const col = RAT_COL0 + (frame % 3);
  const row = frame % 6 < 3 ? 1 : 2;
  return `<div class="spr rat${movingLeft ? "" : " flip"}" style="background-position:-${col * 48}px -${row * 48}px;opacity:${opacity}"></div>`;
}

function ratIdleHTML(hat: boolean): string {
  return `<div class="spr rat" style="background-position:-${(RAT_COL0 + 1) * 48}px 0">${hat ? HAT_SVG : ""}</div>`;
}

function vehicleHTML(src: string, w: number, h: number, movingLeft: boolean): string {
  return `<img class="spr veh${movingLeft ? " flip" : ""}" src="${src}" width="${w * 2}" height="${h * 2}" alt=""/>`;
}

// One repainted car per route color — see scripts/make-subway-sprites.mjs.
function subwayHTML(line: string | null, movingLeft: boolean): string {
  const hex = (LINE_COLORS[line ?? ""] ?? "#808183").slice(1).toUpperCase();
  return vehicleHTML(`/sprites/subway/${hex}.png`, 50, 24, movingLeft);
}

// A plain emoji glyph as a marker (used for Rick's citibike). Apple's 🚲 faces
// left like the rat, so flip when he's heading right.
function emojiSpriteHTML(emoji: string, px: number, movingLeft: boolean, facesLeft = true): string {
  const flip = facesLeft ? !movingLeft : movingLeft;
  return `<span class="spr emoji-spr${flip ? " flip" : ""}" style="font-size:${px}px">${emoji}</span>`;
}

// ---- cuisine emoji --------------------------------------------------------
// One emoji per cuisine; a restaurant takes the first of its cuisines we know.
const CUISINE_EMOJI: Record<string, string> = {
  Italian: "🍝",
  "American (New)": "🍽️",
  Steakhouse: "🥩",
  French: "🥐",
  "Japanese / Sushi": "🍣",
  Mediterranean: "🫒",
  Seafood: "🦞",
  "Asian Fusion": "🥢",
  Chinese: "🥡",
  Korean: "🍲",
  Thai: "🍜",
  "American (Traditional)": "🍗",
  Mexican: "🌮",
  Greek: "🥙",
  Indian: "🍛",
  "Bars/Cocktails": "🍸",
  Eclectic: "🍴",
  "Latin American": "🫔",
  "Middle Eastern": "🧆",
  Spanish: "🥘",
  Brazilian: "🍖",
  Pizza: "🍕",
  Caribbean: "🌴",
  Irish: "🍺",
  Gastropub: "🍻",
  Continental: "🍽️",
  Vegetarian: "🥗",
  Turkish: "🌯",
  "Eastern European": "🥟",
  Argentinian: "🍷",
  Cuban: "🥪",
  Barbecue: "🍖",
  "Pan-Asian": "🥢",
  Peruvian: "🐟",
  "Cajun/Creole": "🦐",
  Burgers: "🍔",
  "Modern European": "🍽️",
  Vegan: "🌱",
  Vietnamese: "🥖",
  "Soul Food / Southern": "🍗",
  Delicatessen: "🥪",
  "Puerto Rican": "🍤",
  Ethiopian: "🫓",
  Jamaican: "🌶️",
  Malaysian: "🍜",
  Filipino: "🍢",
  Hawaiian: "🍍",
  Moroccan: "🫖",
  Southwestern: "🌵",
  Russian: "🥃",
  Ukrainian: "🌻",
  Austrian: "🥨",
};

function emojiFor(cuisines: string[]): string {
  for (const c of cuisines) if (CUISINE_EMOJI[c]) return CUISINE_EMOJI[c];
  return "🍴";
}

// Draw a bare cuisine emoji (no coin/ring) as ImageData for map.addImage,
// registered once per distinct emoji. A soft shadow keeps it legible over
// light basemap areas without adding a visible shape behind it.
function emojiIcon(emoji: string, size = 48): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.font = `${Math.round(size * 0.8)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = size * 0.06;
  ctx.fillText(emoji, size / 2, size / 2 + size * 0.04);
  return ctx.getImageData(0, 0, size, size);
}

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

type Mode = "walk" | "bike" | "cab" | "ride" | "chef";

interface Leg {
  kind: "walk" | "bike" | "cab" | "ride";
  coords: LngLat[];
  cum: number[]; // cumulative meters
  total: number;
  line?: string;
  board?: string;
  exit?: string;
}

interface Journey {
  legs: Leg[];
  legIdx: number;
  traveled: number;
  dest: MapPin;
}

// Official MTA route colors — the one deliberate splash of color on the map.
const LINE_COLORS: Record<string, string> = {
  "1": "#EE352E", "2": "#EE352E", "3": "#EE352E",
  "4": "#00933C", "5": "#00933C", "6": "#00933C",
  "7": "#B933AD",
  A: "#0039A6", C: "#0039A6", E: "#0039A6", SIR: "#0039A6",
  B: "#FF6319", D: "#FF6319", F: "#FF6319", M: "#FF6319",
  G: "#6CBE45",
  J: "#996633", Z: "#996633",
  L: "#A7A9AC",
  N: "#FCCC0A", Q: "#FCCC0A", R: "#FCCC0A", W: "#FCCC0A",
  S: "#808183",
};

const SPEED: Record<Leg["kind"], number> = { walk: 320, bike: 700, cab: 1300, ride: 2000 };

function cumulate(coords: LngLat[]): { cum: number[]; total: number } {
  const cum = [0];
  for (let i = 1; i < coords.length; i++) {
    cum.push(cum[i - 1] + haversine(coords[i - 1], coords[i]));
  }
  return { cum, total: cum[cum.length - 1] };
}

function makeLeg(kind: Leg["kind"], coords: LngLat[], extra?: Partial<Leg>): Leg {
  return { kind, coords, ...cumulate(coords), ...extra };
}

async function osrm(from: LngLat, to: LngLat, profile: "foot" | "bike" | "driving"): Promise<LngLat[]> {
  try {
    const url = `https://router.project-osrm.org/route/v1/${profile}/${from[0]},${from[1]};${to[0]},${to[1]}?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error(String(res.status));
    const d = await res.json();
    const coords = d.routes?.[0]?.geometry?.coordinates;
    if (coords?.length >= 2) return coords;
  } catch {}
  return [from, to]; // straight-line fallback
}

export function MapView({ pins }: { pins: MapPin[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const markerElRef = useRef<HTMLDivElement | null>(null);
  const subwayRef = useRef<SubwayData | null>(null);
  const journeyRef = useRef<Journey | null>(null);
  const posRef = useRef<LngLat>([-73.985, 40.74]);
  const flipRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusRef = useRef<MapPin | null>(null);
  const planningRef = useRef(false);
  const roamRef = useRef(true);

  const [focus, setFocus] = useState<MapPin | null>(null);
  const [roam, setRoam] = useState(true);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<Mode>("walk");
  const [line, setLine] = useState<string | null>(null); // route rick is riding
  const [frame, setFrame] = useState(0);
  const [status, setStatus] = useState("rick is checking the service alerts...");
  const [q, setQ] = useState("");

  const matched = useMemo(() => {
    const raw = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!raw.length) return null;
    const hays = pins.map((p) => ({
      p,
      hay: `${p.name} ${p.cuisines.join(" ")} ${p.location} ${p.address ?? ""} ${p.offers}`.toLowerCase(),
    }));
    // Every meaningful word must match: "pizza brooklyn" = pizza in brooklyn.
    // But drop filler words that match nothing (a conversational "date night in
    // hudson yards" narrows to "hudson yards" instead of returning zero).
    let terms = raw.filter((t) => hays.some((h) => h.hay.includes(t)));
    if (!terms.length) terms = raw; // nothing matched at all — show the empty state
    return hays.filter((h) => terms.every((t) => h.hay.includes(t))).map((h) => h.p);
  }, [q, pins]);

  const setActiveLine = useCallback((next: string | null) => {
    setLine(next);
    const map = mapRef.current;
    if (!map || !map.getLayer("subway-active")) return;
    map.setFilter("subway-active", ["==", ["get", "line"], next ?? "__none__"]);
  }, []);

  const startJourney = useCallback(async (dest: MapPin) => {
    if (planningRef.current) return;
    planningRef.current = true;
    try {
      const from = posRef.current;
      const to: LngLat = [dest.lng, dest.lat];
      const dist = haversine(from, to);
      const legs: Leg[] = [];

      const ride = dist > 2200 && subwayRef.current ? planRide(subwayRef.current, from, to) : null;
      if (ride) {
        const walkIn = await osrm(from, ride[0].coords[0], "foot");
        legs.push(makeLeg("walk", walkIn));
        for (const r of ride) {
          legs.push(makeLeg("ride", r.coords, { line: r.line, board: r.board, exit: r.exit }));
        }
        const last = ride[ride.length - 1];
        const walkOut = await osrm(last.coords[last.coords.length - 1], to, "foot");
        legs.push(makeLeg("walk", walkOut));
      } else if (dist < 900) {
        legs.push(makeLeg("walk", await osrm(from, to, "foot")));
      } else if (dist < 2600) {
        legs.push(makeLeg("bike", await osrm(from, to, "bike")));
      } else {
        legs.push(makeLeg("cab", await osrm(from, to, "driving")));
      }

      journeyRef.current = { legs, legIdx: 0, traveled: 0, dest };
      applyLeg(legs[0], dest);

      // Frame the whole trip.
      const all = legs.flatMap((l) => l.coords);
      const b = all.reduce((acc, c) => acc.extend(c), new LngLatBounds(all[0], all[0]));
      mapRef.current?.fitBounds(b, { padding: 90, duration: 900, maxZoom: 14.5 });
    } finally {
      planningRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyLeg = useCallback((leg: Leg, dest: MapPin) => {
    const name = dest.name.toLowerCase();
    if (leg.kind === "walk") {
      setMode("walk");
      setStatus(`rick scurries toward ${name}...`);
      setActiveLine(null);
    } else if (leg.kind === "bike") {
      setMode("bike");
      setStatus(`rick hops on a citibike → ${name}`);
      setActiveLine(null);
    } else if (leg.kind === "cab") {
      setMode("cab");
      setStatus(`rick hails a cab → ${name}`);
      setActiveLine(null);
    } else {
      setMode("ride");
      setStatus(
        `rick swipes in at ${leg.board?.toLowerCase()} → rides the ${leg.line} to ${leg.exit?.toLowerCase()}`
      );
      setActiveLine(leg.line ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const randomPin = useCallback(() => pins[Math.floor(Math.random() * pins.length)], [pins]);

  // Roaming toggle: off parks Rick wherever he is (any trip in flight is
  // dropped); on sends him back out. Picking a spot still works either way.
  const toggleRoam = useCallback(() => {
    const next = !roamRef.current;
    roamRef.current = next;
    setRoam(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (next) {
      if (!focusRef.current) {
        timerRef.current = setTimeout(() => startJourney(randomPin()), 400);
      }
    } else {
      journeyRef.current = null;
      setMode("chef");
      setActiveLine(null);
      setStatus("rick is taking five. hit roam to send him back out.");
    }
  }, [randomPin, setActiveLine, startJourney]);

  // Map init.
  useEffect(() => {
    // Webpack breaks MapLibre's relative worker URL; serve it ourselves
    // (staged into public/vendor by scripts/copy-maplibre-worker.mjs).
    setWorkerUrl("/vendor/maplibre-gl-worker.mjs");
    const map = new MLMap({
      container: containerRef.current!,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      style: MAP_STYLE as any,
      bounds: [
        [-74.045, 40.63],
        [-73.83, 40.85],
      ],
      maxBounds: [
        [-74.5, 40.3],
        [-73.4, 41.05],
      ],
      attributionControl: { compact: true },
      // On touch devices, one finger scrolls the page; two fingers pan the
      // map — otherwise the map swallows every scroll gesture on mobile.
      cooperativeGestures: window.matchMedia("(pointer: coarse)").matches,
    });
    mapRef.current = map;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof window !== "undefined") (window as any).__rickMap = map;
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.on("error", (e) => console.warn("map error:", e.error?.message ?? e));

    map.on("load", async () => {
      // Subway lines + stations (real MTA geometry).
      const subway: SubwayData = await (await fetch("/subway.json")).json();
      subwayRef.current = subway;
      const lineFeatures = Object.entries(subway.lines).flatMap(([line, segs]) =>
        segs.map((coords) => ({
          type: "Feature" as const,
          properties: { line, color: LINE_COLORS[line] ?? "#808183" },
          geometry: { type: "LineString" as const, coordinates: coords },
        }))
      );
      map.addSource("subway", { type: "geojson", data: { type: "FeatureCollection", features: lineFeatures } });
      map.addLayer({
        id: "subway",
        type: "line",
        source: "subway",
        paint: {
          "line-color": ["get", "color"],
          "line-opacity": 0.4,
          "line-width": ["interpolate", ["linear"], ["zoom"], 9, 1, 14, 2.5],
        },
      });
      map.addLayer({
        id: "subway-active",
        type: "line",
        source: "subway",
        filter: ["==", ["get", "line"], "__none__"],
        paint: {
          "line-color": ["get", "color"],
          "line-opacity": 0.95,
          "line-width": ["interpolate", ["linear"], ["zoom"], 9, 2.5, 14, 5],
        },
      });
      map.addSource("stations", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: subway.stations.map((s) => ({
            type: "Feature" as const,
            properties: { name: s.n },
            geometry: { type: "Point" as const, coordinates: [s.x, s.y] },
          })),
        },
      });
      map.addLayer({
        id: "stations",
        type: "circle",
        source: "stations",
        minzoom: 11.5,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 12, 1.5, 15, 3.5],
          "circle-color": "#6b6357",
        },
      });

      // Restaurant pins: a cuisine emoji coin per spot.
      map.addSource("restaurants", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: pins.map((p) => ({
            type: "Feature" as const,
            properties: { slug: p.slug, name: p.name, emoji: emojiFor(p.cuisines) },
            geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
          })),
        },
      });
      for (const em of new Set(pins.map((p) => emojiFor(p.cuisines)))) {
        if (!map.hasImage(em)) map.addImage(em, emojiIcon(em), { pixelRatio: 2 });
      }
      // Zoomed out: simple dots. Zoomed in: cuisine emoji. The two crossfade
      // across a narrow zoom band so the switch feels smooth.
      map.addLayer({
        id: "pin-dots",
        type: "circle",
        source: "restaurants",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 2.5, 13, 4],
          "circle-color": "#f2e9dc",
          "circle-stroke-color": "#000000",
          "circle-stroke-width": 1,
          "circle-opacity": ["interpolate", ["linear"], ["zoom"], 12.5, 1, 13.5, 0],
          "circle-stroke-opacity": ["interpolate", ["linear"], ["zoom"], 12.5, 1, 13.5, 0],
        },
      });
      map.addLayer({
        id: "pins",
        type: "symbol",
        source: "restaurants",
        layout: {
          "icon-image": ["get", "emoji"],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
          // Emoji grow with zoom — roughly double from mid to close zoom.
          "icon-size": ["interpolate", ["linear"], ["zoom"], 13, 0.5, 16, 1.0],
        },
        paint: {
          "icon-opacity": ["interpolate", ["linear"], ["zoom"], 12.5, 0, 13.5, 1],
        },
      });

      const popup = new Popup({
        closeButton: false,
        closeOnClick: false,
        className: "rw-popup",
        offset: 10,
      });
      for (const layer of ["pins", "pin-dots"]) {
        map.on("mouseenter", layer, (e: MapLayerMouseEvent) => {
          map.getCanvas().style.cursor = "pointer";
          const f = e.features?.[0];
          if (f && f.geometry.type === "Point") {
            popup
              .setLngLat(f.geometry.coordinates as LngLat)
              .setText((f.properties.name as string).toLowerCase())
              .addTo(map);
          }
        });
        map.on("mouseleave", layer, () => {
          map.getCanvas().style.cursor = "";
          popup.remove();
        });
        map.on("click", layer, (e: MapLayerMouseEvent) => {
          const slug = e.features?.[0]?.properties.slug;
          const pin = pins.find((p) => p.slug === slug);
          if (pin) setFocus(pin);
        });
      }

      // Rick.
      const el = document.createElement("div");
      el.className = "rick-marker";
      el.innerHTML = ratIdleHTML(false);
      markerElRef.current = el;
      markerRef.current = new Marker({ element: el, anchor: "bottom" })
        .setLngLat(posRef.current)
        .addTo(map);

      setReady(true);
      timerRef.current = setTimeout(() => {
        if (roamRef.current && !focusRef.current) startJourney(randomPin());
      }, 1500);
    });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Animation loop.
  useEffect(() => {
    let raf: number;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const j = journeyRef.current;
      if (j) {
        const leg = j.legs[j.legIdx];
        j.traveled += SPEED[leg.kind] * dt;
        if (j.traveled >= leg.total) {
          if (j.legIdx < j.legs.length - 1) {
            j.legIdx++;
            j.traveled = 0;
            applyLeg(j.legs[j.legIdx], j.dest);
          } else {
            posRef.current = [j.dest.lng, j.dest.lat];
            markerRef.current?.setLngLat(posRef.current);
            journeyRef.current = null;
            setMode("chef");
            setStatus(`rick's eating at ${j.dest.name.toLowerCase()}`);
            setActiveLine(null);
            if (!focusRef.current && roamRef.current) {
              timerRef.current = setTimeout(() => startJourney(randomPin()), 4200);
            }
          }
        } else {
          // Interpolate along the leg.
          const { coords, cum } = leg;
          let i = 1;
          while (i < cum.length - 1 && cum[i] < j.traveled) i++;
          const span = cum[i] - cum[i - 1] || 1;
          const t = (j.traveled - cum[i - 1]) / span;
          const a = coords[i - 1], b = coords[i];
          const lng = a[0] + (b[0] - a[0]) * t;
          const lat = a[1] + (b[1] - a[1]) * t;
          if (Math.abs(b[0] - a[0]) > 1e-7) flipRef.current = b[0] < a[0];
          posRef.current = [lng, lat];
          markerRef.current?.setLngLat([lng, lat]);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [applyLeg, randomPin, setActiveLine, startJourney]);

  // Search drives the map: only matching pins stay visible, and the view
  // frames them so results are immediately obvious.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !map.getLayer("pins")) return;
    if (matched && matched.length) {
      const slugs = matched.map((p) => p.slug);
      map.setFilter("pins", ["in", ["get", "slug"], ["literal", slugs]]);
      map.setFilter("pin-dots", ["in", ["get", "slug"], ["literal", slugs]]);
      const b = new LngLatBounds([matched[0].lng, matched[0].lat], [matched[0].lng, matched[0].lat]);
      for (const p of matched) b.extend([p.lng, p.lat]);
      map.fitBounds(b, { padding: 80, duration: 700, maxZoom: 14 });
    } else {
      map.setFilter("pins", null);
      map.setFilter("pin-dots", null);
    }
  }, [matched, ready]);

  // Focus → send Rick there.
  useEffect(() => {
    focusRef.current = focus;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (focus) {
      journeyRef.current = null;
      startJourney(focus);
      setTimeout(() => {
        document.querySelector(".map-focus")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 350);
    } else if (roamRef.current) {
      timerRef.current = setTimeout(() => startJourney(randomPin()), 2000);
    }
  }, [focus, startJourney, randomPin]);

  // Walk-cycle frames while moving (6-frame cycle across the sheet's two rows).
  useEffect(() => {
    if (mode !== "walk") return;
    const t = setInterval(() => setFrame((f) => (f + 1) % 6), 140);
    return () => clearInterval(t);
  }, [mode]);

  // Swap the marker sprite when mode/frame/direction change.
  useEffect(() => {
    const el = markerElRef.current;
    if (!el) return;
    const left = flipRef.current;
    el.innerHTML =
      mode === "walk" ? ratWalkHTML(frame, left)
      : mode === "ride" ? subwayHTML(line, left)
      : mode === "bike" ? emojiSpriteHTML("🚲", 30, left)
      : mode === "cab" ? vehicleHTML("/sprites/taxi.png", 33, 14, left)
      : ratIdleHTML(true);
  }, [mode, frame, line]);

  return (
    <div className="map-page wrap">
      <div className="ask-head">
        <Rick size={56} />
        <div className="ask-title">rick&apos;s map</div>
      </div>
      <div className="ask-sub">
        {pins.length} spots pinned. <span className="touch-hint">two fingers to pan.</span>
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

      <div className="map-status-row">
        <div className="line sys map-status">{status}</div>
        <button
          className="roam-toggle"
          type="button"
          onClick={toggleRoam}
          aria-pressed={roam}
          title={roam ? "stop rick wandering the map" : "let rick wander the map again"}
        >
          {roam ? "stop rick" : "roam"}
        </button>
      </div>

      <div ref={containerRef} className="map-canvas" />

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
          <button
            className="example roam"
            onClick={() => {
              setFocus(null);
              if (!roamRef.current) toggleRoam();
            }}
          >
            let rick roam free
          </button>
        </div>
      )}
    </div>
  );
}
