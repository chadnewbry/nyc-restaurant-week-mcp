"use client";

import { useState } from "react";
import posthog from "posthog-js";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className={`copy-btn${copied ? " copied" : ""}`}
      onClick={() => {
        navigator.clipboard.writeText(text);
        posthog.capture("mcp_snippet_copied", { text });
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
    >
      {copied ? "copied" : "copy"}
    </button>
  );
}
