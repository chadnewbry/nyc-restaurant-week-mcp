// Refreshes data/restaurants.json from the public NYC Tourism program API
// (the same API the nyctourism.com restaurant-week page calls from the browser).
// Usage: npm run scrape
import { writeFileSync } from "node:fs";

const API = "https://program-api.nyctourism.com/restaurant-week";
const KEY = "lTQSe929f34fohKaNq0OH53mdVL0yncvtqmuUG6i"; // public key embedded in nyctourism.com client JS

const CUISINES_OK = (lookup) =>
  new Set(Object.keys(lookup["Cuisine"] ?? {}).filter((k) => !["label", "type", "values", "lookupName"].includes(k)));
const ACCESS_OK = (lookup) =>
  new Set(Object.keys(lookup["Accessibility"] ?? {}).filter((k) => !["label", "type", "values", "lookupName"].includes(k)));

function parseOffer(mt) {
  const m = /^\$(\d+)\s+(Sunday\s+)?(.+?)\s+Price$/.exec(mt);
  if (!m) return null;
  return {
    meal: m[3].toLowerCase().replace("lunch/brunch", "brunch"),
    price: Number(m[1]),
    sunday: Boolean(m[2]),
  };
}

const items = [];
let lookup = null;
for (let page = 0; ; page++) {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": KEY },
    body: JSON.stringify({ page, lookup: {} }),
  });
  if (!res.ok) throw new Error(`page ${page}: HTTP ${res.status}`);
  const d = await res.json();
  lookup ??= d.lookup;
  if (!d.items?.length) break;
  items.push(...d.items);
  console.log(`page ${page}: ${items.length}/${d.total}`);
  if (items.length >= d.total) break;
  await new Promise((r) => setTimeout(r, 300));
}

const cuisines = CUISINES_OK(lookup);
const access = ACCESS_OK(lookup);
const seen = new Set();
const out = [];
for (const r of items) {
  if (seen.has(r.slug)) continue;
  seen.add(r.slug);
  const tags = r.tags ?? [];
  let img = r.image?.url ?? "";
  if (img.startsWith("//")) img = "https:" + img;
  out.push({
    name: r.shortTitle,
    slug: r.slug,
    summary: (r.summary ?? "").trim(),
    borough: r.borough,
    neighborhood: r.neighborhood,
    cuisines: tags.filter((t) => cuisines.has(t)).sort(),
    accessibility: tags.filter((t) => access.has(t)).sort(),
    offers: (r.mealTypes ?? []).map(parseOffer).filter(Boolean),
    weeks: (r.restaurantInclusionWeek ?? [])
      .map((w) => Number(/^Week (\d+)/.exec(w)?.[1]))
      .filter(Boolean)
      .sort((a, b) => a - b),
    collections: [...new Set(r.collections ?? [])].sort(),
    menuUrl: r.menuFileUrl || null,
    website: r.website || null,
    opentableId: r.ecommerce?.partnerName === "OpenTable" ? r.ecommerce.partnerId : null,
    image: img || null,
  });
}
out.sort((a, b) => (a.name ?? "").toLowerCase().localeCompare((b.name ?? "").toLowerCase()));
writeFileSync(new URL("../data/restaurants.json", import.meta.url), JSON.stringify(out));
console.log(`saved ${out.length} restaurants`);
