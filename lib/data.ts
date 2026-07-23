import restaurantsJson from "@/data/restaurants.json";

export interface Offer {
  meal: "lunch" | "dinner" | "brunch";
  price: 30 | 45 | 60;
  sunday: boolean;
}

export interface Restaurant {
  name: string;
  slug: string;
  summary: string;
  borough: string;
  neighborhood: string;
  cuisines: string[];
  accessibility: string[];
  offers: Offer[];
  weeks: number[];
  collections: string[];
  menuUrl: string | null;
  website: string | null;
  opentableId: string | null;
  image: string | null;
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
}

export const RESTAURANTS = restaurantsJson as Restaurant[];

// Summer 2026 program calendar. Saturdays are excluded program-wide;
// Sunday participation varies per restaurant (offers with sunday: true).
export const WEEK_DATES: Record<number, { start: string; end: string; label: string }> = {
  1: { start: "2026-07-20", end: "2026-07-26", label: "Week 1 (Jul 20 – Jul 26)" },
  2: { start: "2026-07-27", end: "2026-08-02", label: "Week 2 (Jul 27 – Aug 2)" },
  3: { start: "2026-08-03", end: "2026-08-09", label: "Week 3 (Aug 3 – Aug 9)" },
  4: { start: "2026-08-10", end: "2026-08-16", label: "Week 4 (Aug 10 – Aug 16)" },
  5: { start: "2026-08-17", end: "2026-08-23", label: "Week 5 (Aug 17 – Aug 23)" },
  6: { start: "2026-08-24", end: "2026-08-31", label: "Week 6 (Aug 24 – Aug 31)" },
  7: { start: "2026-09-01", end: "2026-09-06", label: "Week 7 (Sep 1 – Sep 6)" },
};

export function weekForDate(date: string): number | null {
  for (const [week, range] of Object.entries(WEEK_DATES)) {
    if (date >= range.start && date <= range.end) return Number(week);
  }
  return null;
}

export function opentableUrl(r: Restaurant): string | null {
  return r.opentableId
    ? `https://www.opentable.com/restref/client/?rid=${r.opentableId}`
    : null;
}

// Universal Google Maps link. Each Restaurant entry is one physical location
// (chains have one entry per location), so name + address pins the right spot.
export function mapsUrl(r: Restaurant): string {
  const where = r.address
    ? `${r.name}, ${r.address}, ${r.borough}, NY`
    : `${r.name}, ${r.neighborhood}, ${r.borough}, NY`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(where)}`;
}

export interface SearchParams {
  query?: string;
  cuisine?: string;
  borough?: string;
  neighborhood?: string;
  price?: number;
  meal?: "lunch" | "dinner" | "brunch";
  sunday?: boolean;
  week?: number;
  date?: string;
  collection?: string;
  has_menu?: boolean;
  bookable_on_opentable?: boolean;
  limit?: number;
  offset?: number;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function searchRestaurants(p: SearchParams) {
  let week = p.week;
  let dateNote: string | undefined;
  if (p.date) {
    const d = new Date(p.date + "T12:00:00");
    const w = weekForDate(p.date);
    if (w === null) {
      return { total: 0, items: [] as Restaurant[], note: `${p.date} is outside NYC Restaurant Week Summer 2026 (Jul 20 – Sep 6).` };
    }
    week = w;
    if (d.getDay() === 6) {
      return { total: 0, items: [] as Restaurant[], note: `${p.date} is a Saturday — Saturdays are excluded from NYC Restaurant Week at all restaurants. Try Sunday–Friday.` };
    }
    if (d.getDay() === 0) {
      dateNote = `${p.date} is a Sunday — results limited to restaurants with Sunday offers.`;
    }
  }
  const wantSunday = p.sunday || dateNote !== undefined;

  let results = RESTAURANTS.filter((r) => {
    if (p.cuisine && !r.cuisines.some((c) => norm(c).includes(norm(p.cuisine!)))) return false;
    if (p.borough && norm(r.borough) !== norm(p.borough) && !norm(r.borough).includes(norm(p.borough))) return false;
    if (p.neighborhood && !norm(r.neighborhood).includes(norm(p.neighborhood))) return false;
    if (week && !r.weeks.includes(week)) return false;
    if (p.collection && !r.collections.some((c) => norm(c).includes(norm(p.collection!)))) return false;
    if (p.has_menu && !r.menuUrl) return false;
    if (p.bookable_on_opentable && !r.opentableId) return false;
    let offers = r.offers;
    if (wantSunday) offers = offers.filter((o) => o.sunday);
    if (p.meal) offers = offers.filter((o) => o.meal === p.meal);
    if (p.price) offers = offers.filter((o) => o.price <= p.price!);
    if ((wantSunday || p.meal || p.price) && offers.length === 0) return false;
    if (p.query) {
      const q = norm(p.query);
      const hay = norm(`${r.name} ${r.summary} ${r.neighborhood} ${r.borough} ${r.cuisines.join(" ")}`);
      if (!q.split(" ").every((tok) => hay.includes(tok))) return false;
    }
    return true;
  });

  const total = results.length;
  const offset = p.offset ?? 0;
  const limit = Math.min(p.limit ?? 10, 25);
  results = results.slice(offset, offset + limit);
  return { total, items: results, note: dateNote };
}

export function findRestaurant(nameOrSlug: string): Restaurant | null {
  const q = norm(nameOrSlug);
  return (
    RESTAURANTS.find((r) => r.slug === nameOrSlug) ??
    RESTAURANTS.find((r) => norm(r.name) === q) ??
    RESTAURANTS.find((r) => norm(r.name).includes(q)) ??
    null
  );
}

export function facets() {
  const count = (fn: (r: Restaurant) => string[]) => {
    const m = new Map<string, number>();
    for (const r of RESTAURANTS) for (const k of fn(r)) m.set(k, (m.get(k) ?? 0) + 1);
    return Object.fromEntries([...m.entries()].sort((a, b) => b[1] - a[1]));
  };
  return {
    total_restaurants: RESTAURANTS.length,
    cuisines: count((r) => r.cuisines),
    boroughs: count((r) => [r.borough]),
    neighborhoods: count((r) => [r.neighborhood]),
    collections: count((r) => r.collections),
    price_tiers: count((r) => [...new Set(r.offers.map((o) => `$${o.price}`))]),
    meals: count((r) => [...new Set(r.offers.map((o) => o.meal))]),
    weeks: Object.fromEntries(
      Object.entries(WEEK_DATES).map(([w, v]) => [
        v.label,
        RESTAURANTS.filter((r) => r.weeks.includes(Number(w))).length,
      ])
    ),
    sunday_participants: RESTAURANTS.filter((r) => r.offers.some((o) => o.sunday)).length,
  };
}
