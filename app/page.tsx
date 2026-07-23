import Link from "next/link";
import { RickApp } from "./chat";

export default function Home() {
  return (
    <main>
      <RickApp />
      <footer>
        <div className="wrap">
          <div className="pixel-note">unofficial fan-made project · not affiliated with nyc tourism + conventions</div>
          <div className="fine">
            data from public listings at{" "}
            <a href="https://www.nyctourism.com/restaurant-week/" target="_blank" rel="noreferrer">
              nyctourism.com/restaurant-week
            </a>
            . prices and participation can change — always confirm with the restaurant. saturdays
            excluded program-wide; sundays vary. drinks, tax, and tip not included.{" "}
            <Link href="/developers">mcp server for developers →</Link>
          </div>
          <div className="built-by">
            built by{" "}
            <a href="https://x.com/chadnewbry" target="_blank" rel="noreferrer">@chadnewbry</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
