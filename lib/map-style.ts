// Hand-written monochrome MapLibre style over OpenFreeMap vector tiles
// (OpenMapTiles schema) — the site's black/cream palette applied to real
// cartography. No API key required.

const C = {
  land: "#151210",
  water: "#030303",
  park: "#1c1812",
  roadMinor: "#2a251e",
  roadMid: "#372f26",
  roadMajor: "#493f32",
  building: "#1d1914",
  label: "#6b6357",
};

export const MAP_STYLE = {
  version: 8 as const,
  glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
  sources: {
    ofm: {
      type: "vector" as const,
      url: "https://tiles.openfreemap.org/planet",
      attribution:
        '<a href="https://openfreemap.org">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/">OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    },
  },
  layers: [
    { id: "bg", type: "background", paint: { "background-color": C.land } },
    {
      id: "park",
      type: "fill",
      source: "ofm",
      "source-layer": "park",
      paint: { "fill-color": C.park },
    },
    {
      id: "water",
      type: "fill",
      source: "ofm",
      "source-layer": "water",
      paint: { "fill-color": C.water },
    },
    {
      id: "building",
      type: "fill",
      source: "ofm",
      "source-layer": "building",
      minzoom: 14,
      paint: { "fill-color": C.building },
    },
    {
      id: "road-minor",
      type: "line",
      source: "ofm",
      "source-layer": "transportation",
      minzoom: 12,
      filter: ["in", ["get", "class"], ["literal", ["minor", "service", "path", "pedestrian"]]],
      paint: {
        "line-color": C.roadMinor,
        "line-width": ["interpolate", ["linear"], ["zoom"], 12, 0.3, 16, 2],
      },
    },
    {
      id: "road-mid",
      type: "line",
      source: "ofm",
      "source-layer": "transportation",
      minzoom: 10,
      filter: ["in", ["get", "class"], ["literal", ["secondary", "tertiary"]]],
      paint: {
        "line-color": C.roadMid,
        "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.5, 16, 3],
      },
    },
    {
      id: "road-major",
      type: "line",
      source: "ofm",
      "source-layer": "transportation",
      filter: ["in", ["get", "class"], ["literal", ["motorway", "trunk", "primary"]]],
      paint: {
        "line-color": C.roadMajor,
        "line-width": ["interpolate", ["linear"], ["zoom"], 8, 0.6, 16, 4],
      },
    },
    {
      id: "place-labels",
      type: "symbol",
      source: "ofm",
      "source-layer": "place",
      filter: [
        "in",
        ["get", "class"],
        ["literal", ["city", "borough", "suburb", "neighbourhood", "island"]],
      ],
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Noto Sans Regular"],
        "text-transform": "lowercase",
        "text-size": ["interpolate", ["linear"], ["zoom"], 9, 10, 14, 13],
      },
      paint: {
        "text-color": C.label,
        "text-halo-color": "#000000",
        "text-halo-width": 1.2,
      },
    },
  ],
};
