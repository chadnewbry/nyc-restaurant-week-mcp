// Rick, the resident rat — hand-drawn pixel map rendered as SVG rects.
// '#' = cream fur, '.' = transparent. Eyes and nose are drawn on top so the
// eyes can blink independently.

const FACE = [
  "..##........##..",
  ".####......####.",
  ".####......####.",
  "..############..",
  ".##############.",
  "################",
  "################",
  "################",
  ".##############.",
  "..############..",
  "....########....",
];

const EYES = [
  { x: 4, y: 5 },
  { x: 10, y: 5 },
];

const NOSE = { x: 7, y: 8, w: 2, h: 1 };

// whisker rows: [y, x-start, length] on each side, outside the face
const WHISKERS = [
  { x: 0, y: 6, w: 2 },
  { x: 1, y: 8, w: 2 },
  { x: 18, y: 6, w: 2 },
  { x: 17, y: 8, w: 2 },
];

export function Rick({ size = 120, bob = false }: { size?: number; bob?: boolean }) {
  const cols = 20; // 16 face + 2 whisker margin each side
  const rows = FACE.length;
  const offX = 2;
  return (
    <svg
      className={`rick${bob ? " bob" : ""}`}
      width={size}
      height={(size * rows) / cols}
      viewBox={`0 0 ${cols} ${rows}`}
      shapeRendering="crispEdges"
      aria-label="Rick the rat"
      role="img"
    >
      {FACE.flatMap((row, y) =>
        row.split("").map((c, x) =>
          c === "#" ? (
            <rect key={`${x}-${y}`} x={x + offX} y={y} width="1" height="1" fill="var(--ink)" />
          ) : null
        )
      )}
      {WHISKERS.map((w, i) => (
        <rect key={`w${i}`} x={w.x} y={w.y} width={w.w} height="0.5" fill="var(--dim)" />
      ))}
      {EYES.map((e, i) => (
        <rect
          key={`e${i}`}
          className={`eye${i === 1 ? " r" : ""}`}
          x={e.x + offX}
          y={e.y}
          width="2"
          height="2"
          fill="#000"
        />
      ))}
      <rect x={NOSE.x + offX} y={NOSE.y} width={NOSE.w} height={NOSE.h} fill="#000" />
    </svg>
  );
}
