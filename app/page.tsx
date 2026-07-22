import { RESTAURANTS, facets } from "@/lib/data";
import { CopyButton } from "./copy-button";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nyc-restaurant-week-mcp.vercel.app";
const MCP_URL = `${SITE}/mcp`;

const CLAUDE_CMD = `claude mcp add --transport http nyc-restaurant-week ${MCP_URL}`;
const JSON_CONFIG = `{
  "mcpServers": {
    "nyc-restaurant-week": {
      "type": "http",
      "url": "${MCP_URL}"
    }
  }
}`;
const CURSOR_CONFIG = `{
  "mcpServers": {
    "nyc-restaurant-week": {
      "url": "${MCP_URL}"
    }
  }
}`;

const PROMPTS = [
  "Find me a $45 Italian dinner in the West Village next Thursday, and pull up the menu before I commit.",
  "What are the best hidden-gem sushi spots doing Restaurant Week lunch under $30?",
  "We're 4 people in Astoria on Sunday Aug 9 — who's actually open, and can I book on OpenTable?",
  "Plan a 3-stop Restaurant Week crawl: lunch in Tribeca, dinner in Brooklyn, all $45 or less.",
];

const TOOLS = [
  { name: "search_restaurants", desc: "Filter all 612 participants by cuisine, borough, neighborhood, price tier, meal, program week, exact date, curated collection, or free text." },
  { name: "get_restaurant", desc: "Full detail on one spot: every prix-fixe offer, participating weeks, the Restaurant Week menu PDF, website, and a direct OpenTable reservation link." },
  { name: "check_date", desc: "Give it a date and it tells you if Restaurant Week is on, which program week it is, and the Saturday/Sunday rules that apply." },
  { name: "list_filters", desc: "Every cuisine, neighborhood, collection, and price tier with live participant counts — so your AI never guesses at filter values." },
];

export default function Home() {
  const f = facets();
  const featured = RESTAURANTS.filter((r) => r.collections.length > 0 && r.image).slice(0, 8);

  return (
    <main>
      <div className="hero">
        <div className="wrap">
          <div className="badge"><span className="dot" />Live now · Jul 20 – Sep 6, 2026</div>
          <h1>
            NYC Restaurant Week, <span className="grad">on tap for your AI.</span>
          </h1>
          <p className="sub">
            A free, open <strong>MCP server</strong> that gives Claude, Cursor, or any MCP client
            instant access to all <strong>{f.total_restaurants} participating restaurants</strong> —
            searchable by cuisine, price, neighborhood, and date, with menus and OpenTable links.
            No API key. One URL.
          </p>
          <div className="hero-cta">
            <div className="cmd">
              <span className="prompt">$</span>
              <span>{CLAUDE_CMD}</span>
              <CopyButton text={CLAUDE_CMD} />
            </div>
          </div>
        </div>
      </div>

      <div className="stats wrap">
        <div className="stat"><div className="num">{f.total_restaurants}</div><div className="lbl">Restaurants</div></div>
        <div className="stat"><div className="num">{Object.keys(f.cuisines).length}</div><div className="lbl">Cuisines</div></div>
        <div className="stat"><div className="num">5</div><div className="lbl">Boroughs</div></div>
        <div className="stat"><div className="num">$30+</div><div className="lbl">Prix fixe</div></div>
        <div className="stat"><div className="num">7</div><div className="lbl">Weeks</div></div>
      </div>

      <section>
        <div className="wrap">
          <div className="kicker">Why</div>
          <h2>Stop tab-hopping through 612 listings.</h2>
          <p className="section-sub">
            The official site is a paginated grid, twelve at a time. Connect this server and just
            ask — your assistant cross-references price, cuisine, dates, Sunday availability, and
            actual menus in one shot.
          </p>
          <div className="prompts">
            {PROMPTS.map((p) => (
              <div className="prompt-card" key={p}><span className="q">&gt;</span>{p}</div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="kicker">Tools</div>
          <h2>Four tools. Everything on the menu.</h2>
          <div className="tools">
            {TOOLS.map((t) => (
              <div className="tool" key={t.name}>
                <code className="name">{t.name}</code>
                <p>{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="install">
        <div className="wrap">
          <div className="kicker">Install</div>
          <h2>Connected in under a minute.</h2>
          <p className="section-sub">
            Streamable HTTP transport, no auth, no key. Endpoint: <code>{MCP_URL}</code>
          </p>
          <div className="install-grid">
            <div className="install-item">
              <h3>Claude Code <span>— one command</span></h3>
              <div className="cmd">
                <span className="prompt">$</span>
                <span>{CLAUDE_CMD}</span>
                <CopyButton text={CLAUDE_CMD} />
              </div>
            </div>
            <div className="install-item">
              <h3>Claude Desktop / claude.ai <span>— Settings → Connectors → Add custom connector, paste the URL</span></h3>
              <div className="cmd">
                <span>{MCP_URL}</span>
                <CopyButton text={MCP_URL} />
              </div>
            </div>
            <div className="install-item">
              <h3>Cursor <span>— add to ~/.cursor/mcp.json</span></h3>
              <pre className="block">{CURSOR_CONFIG}</pre>
            </div>
            <div className="install-item">
              <h3>Any MCP client <span>— generic config</span></h3>
              <pre className="block">{JSON_CONFIG}</pre>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="kicker">A taste</div>
          <h2>From white-tablecloth to hidden gem.</h2>
          <div className="rest-grid">
            {featured.map((r) => (
              <a className="rest" key={r.slug} href={r.website ?? "#"} target="_blank" rel="noreferrer" style={{ textDecoration: "none", color: "inherit" }}>
                <div className="img" style={{ backgroundImage: `url(${r.image})` }} />
                <div className="body">
                  <div className="name">{r.name}</div>
                  <div className="meta">{r.cuisines.join(" · ") || "Restaurant"} — {r.neighborhood}, {r.borough}</div>
                  <div className="offers">
                    {[...new Set(r.offers.filter((o) => !o.sunday).map((o) => `$${o.price} ${o.meal}`))].join(" · ")}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <footer>
        <div className="wrap">
          <div>
            Built as an unofficial community project. Not affiliated with, endorsed by, or sponsored
            by NYC Tourism + Conventions or the NYC Restaurant Week® program.
          </div>
          <div className="fine">
            Restaurant data is sourced from public listings at{" "}
            <a href="https://www.nyctourism.com/restaurant-week/" target="_blank" rel="noreferrer">
              nyctourism.com/restaurant-week
            </a>{" "}
            and refreshed periodically. Prices, menus, dates, and participation can change — always
            confirm with the restaurant. Saturdays are excluded program-wide; Sunday participation
            varies by restaurant. Beverages, tax, and tip are not included in prix-fixe prices.
          </div>
        </div>
      </footer>
    </main>
  );
}
