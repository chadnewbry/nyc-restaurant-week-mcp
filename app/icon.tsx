import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Simplified 8×7 Rick face for favicon scale.
const GRID = [
  ".#....#.",
  "########",
  "########",
  "#x####x#",
  "########",
  ".##xx##.",
  "..####..",
];
const COLORS: Record<string, string> = { "#": "#f2e9dc", x: "#000000" };

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#000000",
          padding: 2,
        }}
      >
        {GRID.map((row, y) => (
          <div key={y} style={{ display: "flex" }}>
            {row.split("").map((c, x) => (
              <div
                key={x}
                style={{ width: 3.5, height: 4, backgroundColor: COLORS[c] ?? "transparent" }}
              />
            ))}
          </div>
        ))}
      </div>
    ),
    size
  );
}
