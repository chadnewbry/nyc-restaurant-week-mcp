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
      if (g.lat == null || g.lat < 40.3 || g.lat > 41.1 || g.lng < -74.5 || g.lng > -73.5) {
        throw new Error("no valid coords");
      }
      list[i] = { ...r, ...g };
    } catch (e) {
      failed.push(`${r.slug} (${e.message})`);
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
