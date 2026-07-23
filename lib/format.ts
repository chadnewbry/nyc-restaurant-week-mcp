import { mapsUrl, opentableUrl, WEEK_DATES, type Restaurant } from "@/lib/data";

export function offerLine(r: Restaurant): string {
  const weekday = r.offers.filter((o) => !o.sunday).map((o) => `$${o.price} ${o.meal}`);
  const sunday = r.offers.filter((o) => o.sunday).map((o) => `$${o.price} ${o.meal}`);
  let s = weekday.join(", ");
  if (sunday.length) s += ` · Sunday: ${sunday.join(", ")}`;
  return s;
}

export function compact(r: Restaurant) {
  return {
    name: r.name,
    slug: r.slug,
    cuisines: r.cuisines,
    location: `${r.neighborhood}, ${r.borough}`,
    address: r.address ?? null,
    offers: offerLine(r),
    weeks: r.weeks,
    summary: r.summary,
  };
}

export function full(r: Restaurant) {
  return {
    ...compact(r),
    offers_detail: r.offers,
    weeks_detail: r.weeks.map((w) => WEEK_DATES[w]?.label ?? `Week ${w}`),
    collections: r.collections,
    accessibility: r.accessibility,
    restaurant_week_menu_pdf: r.menuUrl,
    website: r.website,
    reserve_on_opentable: opentableUrl(r),
    image: r.image,
    address: r.address ?? null,
    coordinates: r.lat != null && r.lng != null ? { lat: r.lat, lng: r.lng } : null,
    google_maps: mapsUrl(r),
  };
}

// Card shape rendered by the landing-page chat UI.
export function card(r: Restaurant) {
  return {
    name: r.name,
    slug: r.slug,
    cuisines: r.cuisines,
    location: `${r.neighborhood}, ${r.borough}`,
    offers: offerLine(r),
    weeks: r.weeks,
    summary: r.summary,
    menuUrl: r.menuUrl,
    opentable: opentableUrl(r),
    website: r.website,
    image: r.image,
    address: r.address ?? null,
    maps: mapsUrl(r),
    lat: r.lat ?? null,
    lng: r.lng ?? null,
  };
}

export type RestaurantCard = ReturnType<typeof card>;
