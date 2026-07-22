import { generateText, tool, isStepCount, type ModelMessage } from "ai";
import { z } from "zod";
import { searchRestaurants, findRestaurant, facets, weekForDate, WEEK_DATES, RESTAURANTS } from "@/lib/data";
import { card, compact, full, type RestaurantCard } from "@/lib/format";
import { fallbackAnswer } from "@/lib/fallback";

export const maxDuration = 60;

const MODEL = "anthropic/claude-haiku-4.5";

const SYSTEM = `You are the arcade-style concierge for NYC Restaurant Week Summer 2026 (July 20 – September 6, 2026), embedded on an 8-bit themed website. Today's date is ${new Date().toISOString().slice(0, 10)}.

You help people pick from the ${RESTAURANTS.length} participating restaurants using your tools. Rules of the program: prix-fixe tiers are $30, $45, $60 per person for lunch, brunch, or dinner; Saturdays are excluded everywhere; Sunday participation varies by restaurant; drinks, tax, and tip are not included.

Style: helpful, punchy, 1-4 short sentences, plain text only (no markdown). A light retro-arcade flavor is welcome (sparingly). Always search with tools before answering questions about restaurants — never invent restaurants or details. The UI renders restaurant results as cards below your message, so don't repeat full details in prose; give your recommendation or a one-line take instead. If asked about anything unrelated to NYC Restaurant Week or NYC dining, steer back in one sentence.`;

const tools = {
  search_restaurants: tool({
    description:
      "Search participating restaurants. All filters optional and combinable. Use date (YYYY-MM-DD) when the user names a day — it applies week + Saturday/Sunday rules automatically.",
    inputSchema: z.object({
      query: z.string().optional(),
      cuisine: z.string().optional(),
      borough: z.string().optional(),
      neighborhood: z.string().optional(),
      price: z.number().optional(),
      meal: z.enum(["lunch", "dinner", "brunch"]).optional(),
      sunday: z.boolean().optional(),
      week: z.number().optional(),
      date: z.string().optional(),
      collection: z.string().optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
    }),
    execute: async (args) => {
      const { total, items, note } = searchRestaurants({ ...args, limit: Math.min(args.limit ?? 6, 12) });
      return { total, note, items: items.map(compact) };
    },
  }),
  get_restaurant: tool({
    description: "Full details for one restaurant by slug or name (menu PDF, website, OpenTable link, all offers).",
    inputSchema: z.object({ restaurant: z.string() }),
    execute: async ({ restaurant }) => {
      const r = findRestaurant(restaurant);
      return r ? full(r) : { error: `No restaurant matching '${restaurant}'` };
    },
  }),
  check_date: tool({
    description: "Check if a YYYY-MM-DD date is during Restaurant Week and which rules apply that day.",
    inputSchema: z.object({ date: z.string() }),
    execute: async ({ date }) => {
      const week = weekForDate(date);
      if (week === null) return { in_program: false, note: "Outside Jul 20 – Sep 6, 2026." };
      const day = new Date(date + "T12:00:00").getDay();
      return {
        in_program: true,
        week: WEEK_DATES[week].label,
        saturday_excluded: day === 6,
        sunday_limited: day === 0,
      };
    },
  }),
  list_filters: tool({
    description: "All cuisines, boroughs, neighborhoods, collections, and price tiers with participant counts.",
    inputSchema: z.object({}),
    execute: async () => facets(),
  }),
};

// Best-effort per-instance rate limit (serverless instances each get their own map).
const hits = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - 60_000;
  const arr = (hits.get(ip) ?? []).filter((t) => t > windowStart);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > 10;
}

function cardsFromSlugs(slugs: string[]): RestaurantCard[] {
  const out: RestaurantCard[] = [];
  for (const slug of slugs) {
    const r = RESTAURANTS.find((x) => x.slug === slug);
    if (r && !out.some((c) => c.slug === slug)) out.push(card(r));
    if (out.length >= 6) break;
  }
  return out;
}

export async function POST(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  if (rateLimited(ip)) {
    return Response.json(
      { reply: "SLOW DOWN, PLAYER. TOO MANY REQUESTS — INSERT COIN AND TRY AGAIN IN A MINUTE.", restaurants: [] },
      { status: 429 }
    );
  }

  let body: { messages?: Array<{ role: string; content: string }> };
  try {
    body = await req.json();
  } catch {
    return Response.json({ reply: "BAD INPUT.", restaurants: [] }, { status: 400 });
  }

  const history = (body.messages ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-8)
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content.slice(0, 1000) }));
  const lastUser = [...history].reverse().find((m) => m.role === "user")?.content ?? "";
  if (!lastUser.trim()) {
    return Response.json({ reply: "TYPE A CRAVING TO BEGIN. EXAMPLE: SUSHI IN MIDTOWN UNDER $45.", restaurants: [] });
  }

  try {
    const result = await generateText({
      model: MODEL,
      system: SYSTEM,
      messages: history as ModelMessage[],
      tools,
      stopWhen: isStepCount(5),
      maxOutputTokens: 500,
    });

    // Collect restaurant slugs surfaced by tool calls, in order.
    const slugs: string[] = [];
    for (const step of result.steps) {
      for (const tr of step.toolResults) {
        const out = tr.output as { items?: Array<{ slug: string }>; slug?: string } | undefined;
        if (out?.items) for (const i of out.items) slugs.push(i.slug);
        else if (out?.slug) slugs.push(out.slug);
      }
    }

    return Response.json({
      reply: result.text || "HERE'S WHAT I FOUND.",
      restaurants: cardsFromSlugs(slugs),
    });
  } catch (err) {
    console.error("chat: gateway failed, using fallback search", err);
    const fb = fallbackAnswer(lastUser);
    return Response.json({
      reply: fb.reply,
      restaurants: fb.items.map(card),
      fallback: true,
    });
  }
}
