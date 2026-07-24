import { permanentRedirect } from "next/navigation";

// The map moved to "/" — keep already-shared /map?r=<slug> deep links working.
export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === "string") qs.set(k, v);
    else if (Array.isArray(v)) for (const one of v) qs.append(k, one);
  }
  const query = qs.toString();
  permanentRedirect(query ? `/?${query}` : "/");
}
