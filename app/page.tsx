import Link from "next/link";
import { RESTAURANTS, facets } from "@/lib/data";
import { offerLine } from "@/lib/format";
import { Chat } from "./chat";

const MARQUEE =
  "★ 612 RESTAURANTS ★ $30 / $45 / $60 PRIX FIXE ★ JUL 20 – SEP 6 2026 ★ ALL 5 BOROUGHS ★ NO SATURDAYS ★ ";

export default function Home() {
  const f = facets();
  const featured = RESTAURANTS.filter((r) => r.collections.length > 0 && r.image).slice(0, 8);

  return (
    <main>
      <div className="marquee">
        <div className="marquee-inner">{MARQUEE.repeat(4)}</div>
      </div>

      <div className="hero wrap">
        <h1 className="title">
          NYC Restaurant<br />
          <span className="alt">Week Quest</span>
        </h1>
        <div className="tag">
          PRESS START TO FEAST <span className="blink">█</span>
        </div>
        <p className="sub">
          Chat with CHEF-BOT to search all {f.total_restaurants} participating restaurants —
          by cuisine, borough, price tier, or the day you want to eat. Menus and reservations included.
        </p>
        <Chat />
      </div>

      <div className="wrap">
        <div className="score">
          <div className="s"><div className="v">{f.total_restaurants}</div><div className="k">Restaurants</div></div>
          <div className="s"><div className="v">{Object.keys(f.cuisines).length}</div><div className="k">Cuisines</div></div>
          <div className="s"><div className="v">5</div><div className="k">Boroughs</div></div>
          <div className="s"><div className="v">$30+</div><div className="k">Prix Fixe</div></div>
          <div className="s"><div className="v">7</div><div className="k">Weeks</div></div>
        </div>
      </div>

      <section>
        <div className="wrap">
          <h2 className="h2">Today&apos;s Specials</h2>
          <p className="section-sub">A few of the {f.total_restaurants} spots in play this summer.</p>
          <div className="rest-grid">
            {featured.map((r) => (
              <a className="rest" key={r.slug} href={r.website ?? "#"} target="_blank" rel="noreferrer">
                <div className="img" style={{ backgroundImage: `url(${r.image})` }} />
                <div className="body">
                  <div className="name">{r.name}</div>
                  <div className="meta">{r.cuisines.join(" · ") || "Restaurant"} — {r.neighborhood}</div>
                  <div className="offers">{offerLine(r)}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="wrap" style={{ textAlign: "center" }}>
          <h2 className="h2">Player 2: Developers</h2>
          <p className="section-sub">
            Everything CHEF-BOT knows is also a free open MCP server your AI assistant can use —
            Claude, Cursor, or any MCP client.
          </p>
          <div style={{ marginTop: 24 }}>
            <Link className="px-btn alt" href="/developers">
              → Get the MCP Server
            </Link>
          </div>
        </div>
      </section>

      <footer>
        <div className="wrap">
          <div className="pixel-note">Unofficial fan-made project · Not affiliated with NYC Tourism + Conventions</div>
          <div className="fine">
            Restaurant data sourced from public listings at{" "}
            <a href="https://www.nyctourism.com/restaurant-week/" target="_blank" rel="noreferrer">
              nyctourism.com/restaurant-week
            </a>{" "}
            and refreshed periodically. Prices, menus, dates, and participation can change — always confirm
            with the restaurant. Saturdays are excluded program-wide; Sunday participation varies. Beverages,
            tax, and tip not included. <Link href="/developers">MCP server for developers →</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
