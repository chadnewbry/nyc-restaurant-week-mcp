"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "map" },
  { href: "/search", label: "search" },
  { href: "/developers", label: "mcp" },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="topnav" aria-label="Main">
      <div className="topnav-in">
        {TABS.map((t) => {
          const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
          return (
            <Link key={t.href} href={t.href} className={`tab${active ? " active" : ""}`}>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
