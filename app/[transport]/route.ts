import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import {
  searchRestaurants,
  findRestaurant,
  facets,
  opentableUrl,
  weekForDate,
  WEEK_DATES,
  type Restaurant,
} from "@/lib/data";

export const maxDuration = 60;

function offerLine(r: Restaurant): string {
  const weekday = r.offers.filter((o) => !o.sunday).map((o) => `$${o.price} ${o.meal}`);
  const sunday = r.offers.filter((o) => o.sunday).map((o) => `$${o.price} ${o.meal}`);
  let s = weekday.join(", ");
  if (sunday.length) s += ` · Sunday: ${sunday.join(", ")}`;
  return s;
}

function compact(r: Restaurant) {
  return {
    name: r.name,
    slug: r.slug,
    cuisines: r.cuisines,
    location: `${r.neighborhood}, ${r.borough}`,
    offers: offerLine(r),
    weeks: r.weeks,
    summary: r.summary,
  };
}

function full(r: Restaurant) {
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
  };
}

const json = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 1) }],
});

const handler = createMcpHandler(
  (server) => {
    server.tool(
      "search_restaurants",
      "Search the 612 restaurants participating in NYC Restaurant Week Summer 2026 (Jul 20 – Sep 6). All filters are optional and combinable. Prix-fixe tiers are $30 / $45 / $60 for lunch, brunch, or dinner. Saturdays are excluded program-wide; Sunday participation varies. Returns a paginated list with total count — use get_restaurant with a slug for menus, reservation and website links.",
      {
        query: z.string().optional().describe("Free-text search over name, description, cuisine, and neighborhood (e.g. 'rooftop', 'omakase', 'steak tribeca')"),
        cuisine: z.string().optional().describe("Cuisine filter, e.g. Italian, Japanese / Sushi, Steakhouse, French, Korean, Mexican, Seafood, Indian, Thai (see list_filters for all 50+)"),
        borough: z.enum(["Manhattan", "Brooklyn", "Queens", "The Bronx", "Staten Island"]).optional(),
        neighborhood: z.string().optional().describe("e.g. Tribeca, West Village, Astoria, Williamsburg (see list_filters)"),
        price: z.union([z.literal(30), z.literal(45), z.literal(60)]).optional().describe("Maximum prix-fixe price per person: 30, 45, or 60"),
        meal: z.enum(["lunch", "dinner", "brunch"]).optional(),
        sunday: z.boolean().optional().describe("true = only restaurants offering Restaurant Week on Sundays"),
        week: z.number().int().min(1).max(7).optional().describe("Program week 1–7 (Week 1 starts Jul 20, Week 7 ends Sep 6)"),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("A specific date (YYYY-MM-DD) you want to dine — resolves to the right week and handles Saturday/Sunday rules"),
        collection: z.enum(["hidden-gems", "date-night", "celebrity-chefs", "summer-vibes", "around-the-boroughs", "dress-for-the-occasion", "for-the-foodies", "classic-restaurants"]).optional().describe("Curated NYC Tourism collections"),
        has_menu: z.boolean().optional().describe("true = only restaurants that published their Restaurant Week menu PDF"),
        bookable_on_opentable: z.boolean().optional().describe("true = only restaurants reservable via OpenTable"),
        limit: z.number().int().min(1).max(25).optional().describe("Results per page, default 10, max 25"),
        offset: z.number().int().min(0).optional().describe("Pagination offset"),
      },
      async (args) => {
        const { total, items, note } = searchRestaurants(args);
        return json({
          total_matches: total,
          showing: items.length,
          offset: args.offset ?? 0,
          ...(note ? { note } : {}),
          restaurants: items.map(compact),
        });
      }
    );

    server.tool(
      "get_restaurant",
      "Get full details for one participating restaurant by slug or name: description, all prix-fixe offers, participating weeks, Restaurant Week menu PDF, website, and OpenTable reservation link.",
      {
        restaurant: z.string().describe("Restaurant slug (from search_restaurants) or name, e.g. 'gran-morsi' or 'Gran Morsi'"),
      },
      async ({ restaurant }) => {
        const r = findRestaurant(restaurant);
        if (!r) {
          return json({ error: `No participating restaurant matching '${restaurant}'. Try search_restaurants with a query.` });
        }
        return json(full(r));
      }
    );

    server.tool(
      "list_filters",
      "List every available filter value with participant counts: cuisines, boroughs, neighborhoods, price tiers, meals, curated collections, and the seven program weeks with their dates. Useful before searching, or to summarize the program.",
      {},
      async () => json(facets())
    );

    server.tool(
      "check_date",
      "Check whether a date (YYYY-MM-DD) falls within NYC Restaurant Week Summer 2026 and what the rules are that day (which program week, Saturday exclusion, Sunday limitations), plus how many restaurants participate that day.",
      {
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Date to check, YYYY-MM-DD"),
      },
      async ({ date }) => {
        const week = weekForDate(date);
        if (week === null) {
          return json({ in_program: false, message: `${date} is outside NYC Restaurant Week Summer 2026 (Jul 20 – Sep 6, 2026).` });
        }
        const day = new Date(date + "T12:00:00").getDay();
        if (day === 6) {
          return json({ in_program: true, week: WEEK_DATES[week].label, saturday: true, message: "Saturdays are excluded from NYC Restaurant Week at every restaurant. Choose Sunday–Friday instead." });
        }
        const { total } = searchRestaurants({ date, limit: 1 });
        return json({
          in_program: true,
          week: WEEK_DATES[week].label,
          sunday: day === 0,
          restaurants_available: total,
          message: day === 0
            ? `${date} is a Sunday: ${total} restaurants offer Restaurant Week menus that day.`
            : `${total} restaurants offer Restaurant Week menus on ${date}.`,
        });
      }
    );
  },
  {
    serverInfo: { name: "nyc-restaurant-week", version: "1.0.0" },
  },
  {
    basePath: "",
    maxDuration: 60,
    verboseLogs: false,
    disableSse: true,
  }
);

// A person opening /mcp in a browser sends GET + Accept: text/html — send them
// to the landing page instead of a raw JSON-RPC "Method not allowed" error.
// MCP clients (POST, or GET with event-stream Accept) still reach the handler.
async function GET(req: Request) {
  if ((req.headers.get("accept") ?? "").includes("text/html")) {
    return Response.redirect(new URL("/", req.url), 302);
  }
  return handler(req);
}

export { GET, handler as POST, handler as DELETE };
