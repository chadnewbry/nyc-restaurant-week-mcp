import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nyc-restaurant-week-mcp.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    // Everything is public — including AI crawlers; the whole point of the
    // site is that agents can find and use the MCP endpoint.
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
