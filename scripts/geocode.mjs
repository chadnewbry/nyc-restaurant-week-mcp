// Adds lat/lng/address to data/restaurants.json by reading each restaurant's
// nyctourism.com detail page (which embeds the venue's exact coordinates).
// Safe to re-run: skips restaurants that already have coordinates.
// Usage: npm run geocode
import { readFileSync, writeFileSync } from "node:fs";

const FILE = new URL("../data/restaurants.json", import.meta.url);
const list = JSON.parse(readFileSync(FILE, "utf8"));

async function fetchGeo(slug) {
  const res = await fetch(`https://www.nyctourism.com/restaurant-week/${slug}/`, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; rw-mcp-scraper)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = (await res.text()).replace(/\\"/g, '"');
  const loc = /"location":\{"lon":(-?[\d.]+),"lat":(-?[\d.]+)\}/.exec(html);
  const addr = /"venueAddress":"([^"]+)"/.exec(html);
  return {
    lat: loc ? Number(loc[2]) : null,
    lng: loc ? Number(loc[1]) : null,
    address: addr ? addr[1].split(",")[0].trim() : null,
  };
}

// Fallback for restaurants whose nyctourism.com detail page is missing or has
// no coordinates: place search on OpenStreetMap's Nominatim (max 1 req/sec,
// enforced by chaining all fallback calls through one queue).
const NYC = { latMin: 40.3, latMax: 41.1, lngMin: -74.5, lngMax: -73.5 };
let nomQueue = Promise.resolve();
function nominatim(r) {
  const run = async () => {
    const queries = [
      `${r.name}, ${r.neighborhood}, ${r.borough}, New York`,
      `${r.name}, ${r.borough}, New York`,
      `${r.name}, New York, NY`,
    ];
    for (const q of queries) {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
        { headers: { "user-agent": "nyc-restaurant-week-mcp/1.0 (github.com/chadnewbry/nyc-restaurant-week-mcp)" } }
      );
      await new Promise((s) => setTimeout(s, 1100));
      if (!res.ok) continue;
      const hit = (await res.json())[0];
      if (!hit) continue;
      const lat = Number(hit.lat), lng = Number(hit.lon);
      if (lat < NYC.latMin || lat > NYC.latMax || lng < NYC.lngMin || lng > NYC.lngMax) continue;
      // display_name is "Name, 171, 1st Avenue, ..." — rebuild "171 1st Avenue"
      const parts = hit.display_name.split(",").map((s) => s.trim());
      const address = /^\d/.test(parts[1] ?? "") ? `${parts[1]} ${parts[2] ?? ""}`.trim() : null;
      return { lat, lng, address };
    }
    return null;
  };
  const p = nomQueue.then(run);
  nomQueue = p.catch(() => {});
  return p;
}

const todo = [...list.entries()].filter(([, r]) => r.lat == null);
const total = todo.length;
let done = 0;
const failed = [];

async function worker() {
  while (todo.length) {
    const [i, r] = todo.shift();
    try {
      const g = await fetchGeo(r.slug);
      // sanity: must land in the NYC area
      if (g.lat == null || g.lat < NYC.latMin || g.lat > NYC.latMax || g.lng < NYC.lngMin || g.lng > NYC.lngMax) {
        throw new Error("no valid coords");
      }
      list[i] = { ...r, ...g };
    } catch (e) {
      const fb = await nominatim(r).catch(() => null);
      if (fb) {
        list[i] = { ...r, ...fb };
        console.log(`fallback (nominatim): ${r.slug} → ${fb.address ?? `${fb.lat},${fb.lng}`}`);
      } else {
        failed.push(`${r.slug} (${e.message})`);
      }
    }
    done++;
    if (done % 25 === 0 || done === total) console.log(`${done}/${total}`);
    await new Promise((s) => setTimeout(s, 150));
  }
}

await Promise.all(Array.from({ length: 5 }, worker));
writeFileSync(FILE, JSON.stringify(list));
console.log(`saved. ${total - failed.length}/${total} geocoded.`);
if (failed.length) console.log("failed:", failed.join("\n"));
