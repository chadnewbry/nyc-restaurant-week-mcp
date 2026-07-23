import type { Metadata } from "next";
import { RESTAURANTS } from "@/lib/data";
import { card } from "@/lib/format";
import nycmap from "@/data/nycmap.json";
import { MapView, type MapPin, type NycMap } from "./map-view";

export const metadata: Metadata = {
  title: "rick's map — NYC Restaurant Week",
  description:
    "A pixel map of all five boroughs with every NYC Restaurant Week spot pinned. Watch Rick the rat scurry, citibike, and cab his way to your pick.",
};

export default function MapPage() {
  const pins: MapPin[] = RESTAURANTS.filter((r) => r.lat != null && r.lng != null).map((r) => {
    const { summary, weeks, ...rest } = card(r);
    void summary;
    void weeks;
    return { ...rest, lat: r.lat!, lng: r.lng! };
  });
  return <MapView pins={pins} map={nycmap as NycMap} />;
}
