"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RestaurantCard } from "@/lib/format";
import { Rick } from "./rick";

interface Msg {
  role: "user" | "assistant";
  content: string;
  restaurants?: RestaurantCard[];
}

const INTRO_LINES = [
  "welcome to nyc restaurant week.",
  "this is rick. resident rat.",
  "he knows every kitchen in the city.",
];

const EXAMPLES = [
  "best restaurants for a date",
  "cheap sushi in midtown",
  "sunday brunch in brooklyn",
  "$30 lunch near bryant park",
  "somewhere fancy I can book on opentable",
];

function Cards({ items }: { items: RestaurantCard[] }) {
  if (!items.length) return null;
  return (
    <div className="chat-cards">
      {items.map((r) => (
        <div className="ccard" key={r.slug}>
          <div className="n">{r.name}</div>
          <div className="m">
            {r.location}
            {r.cuisines.length ? ` · ${r.cuisines.join(", ")}` : ""}
          </div>
          <div className="o">{r.offers}</div>
          <div className="links">
            {r.opentable ? <a href={r.opentable} target="_blank" rel="noreferrer">reserve</a> : null}
            {r.menuUrl ? <a href={r.menuUrl} target="_blank" rel="noreferrer">menu</a> : null}
            {r.website ? <a href={r.website} target="_blank" rel="noreferrer">site</a> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function Intro({ onDone }: { onDone: () => void }) {
  const [shown, setShown] = useState(0); // characters revealed across all lines
  const total = INTRO_LINES.join("").length;
  const complete = shown >= total;

  useEffect(() => {
    if (complete) return;
    const t = setInterval(() => setShown((s) => Math.min(s + 1, total)), 42);
    return () => clearInterval(t);
  }, [complete, total]);

  const advance = useCallback(() => {
    if (!complete) setShown(total);
    else onDone();
  }, [complete, total, onDone]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance]);

  let remaining = shown;
  const lines = INTRO_LINES.map((l) => {
    const part = l.slice(0, Math.max(0, remaining));
    remaining -= l.length;
    return part;
  });

  return (
    <div className="stage" onClick={advance}>
      <div className="glow" />
      <Rick size={168} bob />
      <div className="intro-lines">
        {lines.map((l, i) => (
          <div key={i} className={`intro-line${i > 0 ? " dim" : ""}`}>
            {l}
            {!complete && l.length > 0 && l.length < INTRO_LINES[i].length ? <span className="blink">█</span> : null}
          </div>
        ))}
      </div>
      {complete ? (
        <div className="press-enter blink">[ press enter to continue ]</div>
      ) : (
        <div className="press-enter" style={{ opacity: 0.35 }}>[ press enter to skip ]</div>
      )}
    </div>
  );
}

function Ask() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (msgs.length) endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, busy]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: q }];
    setMsgs(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.map(({ role, content }) => ({ role, content })) }),
      });
      const data = await res.json();
      setMsgs((m) => [
        ...m,
        {
          role: "assistant",
          content: (data.reply ?? "something broke in the kitchen. try again.").toLowerCase(),
          restaurants: data.restaurants ?? [],
        },
      ]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", content: "lost the signal. try again in a sec." }]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="ask wrap">
      <div className="ask-head">
        <Rick size={64} />
        <div className="ask-title">ask rick</div>
      </div>
      <div className="ask-sub">612 restaurant week spots. $30 / $45 / $60. jul 20 – sep 6.</div>

      <div className="term">
        <div className="term-body">
          {msgs.map((m, i) => (
            <div key={i}>
              <div className={`line ${m.role === "user" ? "user" : "bot"}`}>{m.content}</div>
              {m.restaurants ? <Cards items={m.restaurants} /> : null}
            </div>
          ))}
          {busy ? (
            <div className="line sys">
              rick is sniffing around<span className="blink">█</span>
            </div>
          ) : null}
          <div ref={endRef} />
        </div>

        <form
          className="term-form"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <input
            ref={inputRef}
            className="term-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="search here..."
            maxLength={400}
            aria-label="Ask Rick about NYC Restaurant Week restaurants"
          />
          <button className="term-send" type="submit" disabled={busy}>
            {busy ? "..." : "ask"}
          </button>
        </form>

        {msgs.length === 0 ? (
          <div className="examples">
            <div className="ex-label">try:</div>
            {EXAMPLES.map((e) => (
              <button key={e} className="example" onClick={() => send(e)} disabled={busy}>
                {e}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function RickApp() {
  const [entered, setEntered] = useState<boolean | null>(null);

  useEffect(() => {
    setEntered(sessionStorage.getItem("rick-entered") === "1");
  }, []);

  if (entered === null) return <div className="stage" />;
  if (!entered) {
    return (
      <Intro
        onDone={() => {
          sessionStorage.setItem("rick-entered", "1");
          setEntered(true);
        }}
      />
    );
  }
  return <Ask />;
}
