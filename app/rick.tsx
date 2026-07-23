// Rick, the resident rat — hand-drawn pixel map rendered as SVG rects.
// '#' = cream fur, '.' = transparent. Ears, eyes, and face details are drawn
// on top so the eyes can blink independently.

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

// inner-ear patches (dim) for softer, rounder ears
const INNER_EARS = [
  { x: 2, y: 1, w: 2, h: 2 },
  { x: 12, y: 1, w: 2, h: 2 },
];

const EYES = [
  { x: 4, y: 5 },
  { x: 10, y: 5 },
];

const NOSE = { x: 7, y: 8, w: 2, h: 1 };

// little pixel smile under the nose
const MOUTH = [
  { x: 6, y: 9, w: 1, h: 0.5 },
  { x: 7, y: 9.4, w: 2, h: 0.5 },
  { x: 9, y: 9, w: 1, h: 0.5 },
];

// blush cheeks just outside the eyes
const BLUSH = [
  { x: 1, y: 7, w: 2, h: 1 },
  { x: 13, y: 7, w: 2, h: 1 },
];

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
      {INNER_EARS.map((p, i) => (
        <rect key={`ie${i}`} x={p.x + offX} y={p.y} width={p.w} height={p.h} fill="var(--dim)" />
      ))}
      {BLUSH.map((p, i) => (
        <rect
          key={`b${i}`}
          x={p.x + offX}
          y={p.y}
          width={p.w}
          height={p.h}
          fill="var(--dim)"
          opacity={0.55}
        />
      ))}
      {EYES.map((e, i) => (
        <g key={`e${i}`} className={`eye${i === 1 ? " r" : ""}`}>
          <rect x={e.x + offX} y={e.y} width="2" height="2" fill="#000" />
          <rect
            x={e.x + offX + 1.15}
            y={e.y + 0.2}
            width="0.6"
            height="0.6"
            fill="var(--ink)"
          />
        </g>
      ))}
      <rect x={NOSE.x + offX} y={NOSE.y} width={NOSE.w} height={NOSE.h} fill="#000" />
      {MOUTH.map((p, i) => (
        <rect key={`m${i}`} x={p.x + offX} y={p.y} width={p.w} height={p.h} fill="#000" />
      ))}
    </svg>
  );
}
