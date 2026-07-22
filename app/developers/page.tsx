import type { Metadata } from "next";
import Link from "next/link";
import { CopyButton } from "../copy-button";

export const metadata: Metadata = {
  title: "MCP Server — NYC Restaurant Week Quest",
  description:
    "Free open MCP server for NYC Restaurant Week Summer 2026. Connect Claude, Cursor, or any MCP client to 612 participating restaurants.",
};

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

const TOOLS = [
  { name: "search_restaurants", desc: "Filter all 612 participants by cuisine, borough, neighborhood, price tier, meal, program week, exact date, curated collection, or free text. Paginated." },
  { name: "get_restaurant", desc: "Full detail on one spot: every prix-fixe offer, participating weeks, the Restaurant Week menu PDF, website, and a direct OpenTable reservation link." },
  { name: "check_date", desc: "Give it a date and it tells you if Restaurant Week is on, which program week it is, and the Saturday/Sunday rules that apply." },
  { name: "list_filters", desc: "Every cuisine, neighborhood, collection, and price tier with live participant counts — so your AI never guesses at filter values." },
];

export default function Developers() {
  return (
    <main>
      <div className="hero dev-wrap" style={{ textAlign: "center" }}>
        <h1 className="title" style={{ fontSize: "clamp(18px, 3.4vw, 34px)" }}>
          <span className="alt">MCP Server</span>
        </h1>
        <div className="tag">LEVEL 2: CONNECT YOUR AI <span className="blink">█</span></div>
        <p className="sub">
          The same data behind CHEF-BOT, as a free open MCP server. Streamable HTTP, no auth, no API key.
          One URL and your assistant can search every NYC Restaurant Week menu.
        </p>
        <div style={{ marginTop: 22 }}>
          <Link className="px-btn ghost" href="/">← Back to the arcade</Link>
        </div>
      </div>

      <div className="dev-wrap">
        <div className="install-item">
          <h3>Endpoint</h3>
          <div className="cmd">
            <span>{MCP_URL}</span>
            <CopyButton text={MCP_URL} />
          </div>
        </div>

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

        <section>
          <h2 className="h2">Tools</h2>
          <div className="tools">
            {TOOLS.map((t) => (
              <div className="tool" key={t.name}>
                <span className="name">{t.name}</span>
                <p>{t.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="h2">Try asking</h2>
          <p className="section-sub" style={{ textAlign: "left" }}>
            &gt; Find me a $45 Italian dinner in the West Village next Thursday, and pull up the menu.<br />
            &gt; What hidden-gem sushi spots do Restaurant Week lunch under $30?<br />
            &gt; We&apos;re in Astoria on Sunday Aug 9 — who&apos;s open, and can I book on OpenTable?
          </p>
        </section>
      </div>

      <footer>
        <div className="wrap">
          <div className="pixel-note">Unofficial fan-made project · Not affiliated with NYC Tourism + Conventions</div>
          <div className="fine">
            Data from public listings at{" "}
            <a href="https://www.nyctourism.com/restaurant-week/" target="_blank" rel="noreferrer">nyctourism.com/restaurant-week</a>,
            refreshed periodically. Always confirm details with the restaurant.
          </div>
        </div>
      </footer>
    </main>
  );
}
