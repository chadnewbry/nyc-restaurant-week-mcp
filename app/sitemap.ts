import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nycrestaurantweek.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: `${SITE}/`, lastModified, changeFrequency: "daily", priority: 1 },
    { url: `${SITE}/map`, lastModified, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE}/developers`, lastModified, changeFrequency: "weekly", priority: 0.8 },
  ];
}
