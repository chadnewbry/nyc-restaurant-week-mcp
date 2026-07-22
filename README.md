# NYC Restaurant Week MCP

An unofficial [MCP](https://modelcontextprotocol.io) server for **NYC Restaurant Week Summer 2026** (Jul 20 – Sep 6). Gives Claude, Cursor, or any MCP client searchable access to all 612 participating restaurants — cuisine, borough/neighborhood, $30/$45/$60 prix-fixe tiers, participating weeks, Sunday availability, menu PDFs, and OpenTable reservation links.

- **Site:** `/` — promo landing page
- **MCP endpoint:** `/mcp` — Streamable HTTP, no auth

## Install (Claude Code)

```sh
claude mcp add --transport http nyc-restaurant-week https://nyc-restaurant-week-mcp.vercel.app/mcp
```

## Tools

| Tool | What it does |
|---|---|
| `search_restaurants` | Filter by query, cuisine, borough, neighborhood, price, meal, week, exact date, collection, menu/OpenTable availability. Paginated. |
| `get_restaurant` | Full detail by slug or name, incl. menu PDF + OpenTable link. |
| `check_date` | Is Restaurant Week on for a date? Which week? Saturday/Sunday rules. |
| `list_filters` | All filter values with participant counts. |

## Data

Sourced from the public program API behind [nyctourism.com/restaurant-week](https://www.nyctourism.com/restaurant-week/) (the same JSON the site's own browser client fetches). Refresh with:

```sh
npm run scrape
```

Data lives in `data/restaurants.json` and is bundled into the serverless function at build time — no database.

## Develop / deploy

```sh
npm install
npm run dev      # site on :3000, MCP at http://localhost:3000/mcp
vercel --prod    # deploy
```

Not affiliated with NYC Tourism + Conventions or NYC Restaurant Week®. Always confirm prices and participation with the restaurant.
