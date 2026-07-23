import type { Metadata } from "next";
import { RESTAURANTS } from "@/lib/data";
import { card } from "@/lib/format";
import { MapView, type MapPin } from "./map-view";

export const metadata: Metadata = {
  title: "rick's map — NYC Restaurant Week",
  description:
    "A live map of every NYC Restaurant Week spot on real NYC cartography — subway lines included. Watch Rick the rat walk, citibike, cab, and ride the train to your pick.",
};

export default function MapPage() {
  const pins: MapPin[] = RESTAURANTS.filter((r) => r.lat != null && r.lng != null).map((r) => {
    const { summary, weeks, ...rest } = card(r);
    void summary;
    void weeks;
    return { ...rest, lat: r.lat!, lng: r.lng! };
  });
  return <MapView pins={pins} />;
}
