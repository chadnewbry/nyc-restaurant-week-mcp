// Deterministic query parser used when the AI gateway is unavailable —
// maps a free-text chat message onto structured search filters so the
// landing-page chat still returns useful results.
import { RESTAURANTS, searchRestaurants, type SearchParams } from "@/lib/data";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9$ ]+/g, " ");

export function parseQuery(text: string): SearchParams {
  const t = " " + norm(text) + " ";
  const p: SearchParams = { limit: 6 };

  const priceMatch = t.match(/\$?\s?(30|45|60)\b/);
  if (priceMatch) p.price = Number(priceMatch[1]);
  if (/\b(cheap|budget|affordable)\b/.test(t)) p.price ??= 30;

  if (/\b(lunch)\b/.test(t)) p.meal = "lunch";
  else if (/\b(brunch)\b/.test(t)) p.meal = "brunch";
  else if (/\b(dinner|tonight|evening)\b/.test(t)) p.meal = "dinner";

  if (/\b(sunday|sundays)\b/.test(t)) p.sunday = true;

  for (const b of ["manhattan", "brooklyn", "queens", "staten island"]) {
    if (t.includes(` ${b} `)) { p.borough = b; break; }
  }
  if (/\bbronx\b/.test(t)) p.borough = "The Bronx";

  const hoods = [...new Set(RESTAURANTS.map((r) => r.neighborhood))];
  for (const h of hoods) {
    if (h && t.includes(` ${norm(h).trim()} `)) { p.neighborhood = h; break; }
  }

  const cuisines = [...new Set(RESTAURANTS.flatMap((r) => r.cuisines))];
  for (const c of cuisines) {
    const cn = norm(c).replace(/\s*\(.*\)/, "").trim();
    if (cn && t.includes(` ${cn} `)) { p.cuisine = c; break; }
  }
  if (!p.cuisine) {
    for (const alias of ["sushi", "japanese", "steak", "italian", "french", "korean", "mexican", "thai", "indian", "chinese", "greek", "seafood", "pizza", "bbq", "vegan", "vegetarian"]) {
      if (t.includes(` ${alias} `)) { p.cuisine = alias; break; }
    }
  }

  const week = t.match(/\bweek\s*([1-7])\b/);
  if (week) p.week = Number(week[1]);

  return p;
}

export function fallbackAnswer(text: string) {
  const params = parseQuery(text);
  const { total, items } = searchRestaurants(params);
  const applied = Object.entries(params)
    .filter(([k, v]) => v !== undefined && k !== "limit")
    .map(([k, v]) => `${k}=${v}`)
    .join(" ");
  return {
    reply:
      total === 0
        ? "NO MATCHES FOUND. TRY A CUISINE (ITALIAN, SUSHI, STEAKHOUSE...), A NEIGHBORHOOD, OR A PRICE ($30 / $45 / $60)."
        : `FOUND ${total} MATCH${total === 1 ? "" : "ES"}${applied ? ` FOR ${applied.toUpperCase()}` : ""}. TOP PICKS BELOW.`,
    items,
    total,
  };
}
