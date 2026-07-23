// MapLibre v6 loads its Web Worker from a URL relative to the library module,
// which webpack bundling breaks. We serve the worker (and the shared chunk it
// imports) from /public/vendor and point setWorkerUrl at it — see map-view.tsx.
// Runs automatically via predev/prebuild.
import { copyFileSync, mkdirSync } from "node:fs";

const outDir = new URL("../public/vendor/", import.meta.url);
mkdirSync(outDir, { recursive: true });
for (const f of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  copyFileSync(
    new URL(`../node_modules/maplibre-gl/dist/${f}`, import.meta.url),
    new URL(f, outDir)
  );
}
console.log("copied maplibre worker to public/vendor/");
