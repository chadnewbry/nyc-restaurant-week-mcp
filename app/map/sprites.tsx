// Pixel sprites for Rick's map adventures, same technique as the Rick face:
// character grids rendered as SVG rects.
// '#' = cream, 'o' = dim gray, 'x' = black, '.' = transparent.

const PALETTE: Record<string, string> = {
  "#": "var(--ink)",
  o: "var(--dim)",
  x: "#000",
};

// Side-view rat scurrying right (tail left, nose right). Two leg frames.
export const RAT_RUN: string[][] = [
  [
    "..........##..",
    ".........####.",
    "....##########",
    "oo#########x#o",
    ".o############",
    "..###########.",
    "....##....##..",
  ],
  [
    "..........##..",
    ".........####.",
    "....##########",
    ".o#########x#o",
    "oo############",
    "..###########.",
    "...##....##...",
  ],
];

// Rick on a citibike, pedaling right. Two pedal frames.
export const BIKE: string[][] = [
  [
    "..........##..",
    ".........####.",
    "......####x##o",
    "....########..",
    "...#########..",
    "..oo######....",
    ".##oooooooo##.",
    "####...o..####",
    "####..o...####",
    ".##........##.",
  ],
  [
    "..........##..",
    ".........####.",
    "......####x##o",
    "....########..",
    "...#########..",
    "..oo######....",
    ".##oooooooo##.",
    "####..o...####",
    "####...o..####",
    ".##........##.",
  ],
];

// Yellow cab (well — cream cab) with Rick's ears poking out the window.
export const CAB: string[][] = [
  [
    "....##..........",
    "...####.........",
    "..############..",
    ".#xx##xx##xx###.",
    "#o#o#o#o#o#o#o#o",
    "################",
    "..###......###..",
    "..###......###..",
  ],
];

// Subway car, Rick visible in one window.
export const TRAIN: string[][] = [
  [
    ".##############.",
    "################",
    "##xx##xx##oo##x#",
    "################",
    "#o#o#o#o#o#o#o#o",
    "################",
    "..##..####..##..",
  ],
];

// Front-facing Rick in a chef hat — the "arrived, now cooking" state.
export const CHEF: string[][] = [
  [
    "....######....",
    "...########...",
    "...########...",
    "..##########..",
    ".###......###.",
    ".############.",
    "##############",
    "###xx####xx###",
    "##############",
    ".#####xx#####.",
    "..##########..",
    "....######....",
  ],
];

// Plain-HTML renderer for MapLibre markers (no React inside the map canvas).
const HTML_COLORS: Record<string, string> = { "#": "#f2e9dc", o: "#b5aa9a", x: "#000000" };

export function spriteHTML(grid: string[], px = 3, flip = false): string {
  const w = grid[0].length;
  const h = grid.length;
  const rects = grid
    .flatMap((row, y) =>
      row.split("").map((c, x) =>
        c === "." ? "" : `<rect x="${x}" y="${y}" width="1" height="1" fill="${HTML_COLORS[c]}"/>`
      )
    )
    .join("");
  return `<svg width="${w * px}" height="${h * px}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" style="display:block${flip ? ";transform:scaleX(-1)" : ""}">${rects}</svg>`;
}

export function Sprite({
  grid,
  x,
  y,
  scale = 0.5,
  flip = false,
}: {
  grid: string[];
  x: number;
  y: number;
  scale?: number;
  flip?: boolean;
}) {
  const w = grid[0].length;
  const h = grid.length;
  return (
    <g transform={`translate(${x - (w * scale) / 2} ${y - h * scale}) scale(${scale})`}>
      <g transform={flip ? `translate(${w} 0) scale(-1 1)` : undefined}>
        {grid.flatMap((row, gy) =>
          row.split("").map((c, gx) =>
            c === "." ? null : (
              <rect key={`${gx}-${gy}`} x={gx} y={gy} width="1" height="1" fill={PALETTE[c]} />
            )
          )
        )}
      </g>
    </g>
  );
}
