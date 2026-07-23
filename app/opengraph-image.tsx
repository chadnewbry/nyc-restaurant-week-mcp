import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "ask rick — NYC Restaurant Week, guided by a resident rat";

// Same pixel grids as app/rick.tsx, flattened to one colored cell grid.
const FACE = [
  "..###......###..",
  ".#####....#####.",
  ".#####....#####.",
  ".##############.",
  "################",
  "################",
  "################",
  "################",
  ".##############.",
  "..############..",
  "....########....",
];

const COLORS: Record<string, string> = { "#": "#f2e9dc", o: "#b5aa9a", x: "#000000" };

function buildGrid(): (string | null)[][] {
  const cols = 20, offX = 2;
  const g: (string | null)[][] = FACE.map((row) => {
    const out: (string | null)[] = Array(cols).fill(null);
    row.split("").forEach((c, x) => {
      if (c === "#") out[x + offX] = COLORS["#"];
    });
    return out;
  });
  const put = (x: number, y: number, c: string) => {
    if (g[y]) g[y][x + offX] = COLORS[c];
  };
  // inner ears
  for (const [ex] of [[2], [12]] as const)
    for (let dx = 0; dx < 2; dx++) for (let dy = 1; dy <= 2; dy++) put(ex + dx, dy, "o");
  // eyes with cream sparkle
  for (const ex of [4, 10]) {
    put(ex, 5, "x"); put(ex + 1, 5, "x"); put(ex, 6, "x"); put(ex + 1, 6, "x");
    put(ex + 1, 5, "#");
  }
  // nose + smile
  put(7, 8, "x"); put(8, 8, "x");
  put(6, 9, "x"); put(9, 9, "x"); put(7, 10, "x"); put(8, 10, "x");
  // blush
  put(1, 7, "o"); put(2, 7, "o"); put(13, 7, "o"); put(14, 7, "o");
  // whiskers
  for (const [wx, wy] of [[-2, 6], [-1, 8], [16, 6], [15, 8]] as const) {
    put(wx, wy, "o"); put(wx + 1, wy, "o");
  }
  return g;
}

export default function OpengraphImage() {
  const grid = buildGrid();
  const CELL = 15;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#000000",
          gap: 36,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          {grid.map((row, y) => (
            <div key={y} style={{ display: "flex" }}>
              {row.map((c, x) => (
                <div
                  key={x}
                  style={{ width: CELL, height: CELL, backgroundColor: c ?? "transparent" }}
                />
              ))}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", color: "#f2e9dc", fontSize: 72, fontWeight: 700 }}>
          ask rick
        </div>
        <div style={{ display: "flex", color: "#b5aa9a", fontSize: 30 }}>
          nyc restaurant week · jul 20 – sep 6 · 612 spots · $30 / $45 / $60
        </div>
      </div>
    ),
    size
  );
}
