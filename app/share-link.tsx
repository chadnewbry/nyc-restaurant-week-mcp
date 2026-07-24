"use client";

import { useState } from "react";
import posthog from "posthog-js";

// A "share" link for a restaurant card: copies a /?r=<slug> deep link that
// opens that spot's card on the map (and sends Rick there).
export function ShareLink({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <a
      href={`/?r=${encodeURIComponent(slug)}`}
      onClick={(e) => {
        e.preventDefault();
        navigator.clipboard.writeText(`${window.location.origin}/?r=${encodeURIComponent(slug)}`);
        posthog.capture("share_link_copied", { slug });
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
    >
      {copied ? "copied" : "share"}
    </a>
  );
}
