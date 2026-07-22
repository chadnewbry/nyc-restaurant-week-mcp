"use client";

import { useEffect, useRef, useState } from "react";
import type { RestaurantCard } from "@/lib/format";

interface Msg {
  role: "user" | "assistant";
  content: string;
  restaurants?: RestaurantCard[];
}

const GREETING =
  "WELCOME, HUNGRY PLAYER 1. ASK ME ANYTHING ABOUT NYC RESTAURANT WEEK — CUISINE, NEIGHBORHOOD, PRICE, OR A DATE YOU WANT TO EAT.";

const CHIPS = [
  "sushi under $45",
  "date night in Brooklyn",
  "$30 lunch near Bryant Park",
  "open on Sundays in Astoria",
  "hidden gems",
];

function Cards({ items }: { items: RestaurantCard[] }) {
  if (!items.length) return null;
  return (
    <div className="chat-cards">
      {items.map((r) => (
        <div className="ccard" key={r.slug}>
          {r.image ? <div className="img" style={{ backgroundImage: `url(${r.image})` }} /> : null}
          <div className="b">
            <div className="n">{r.name}</div>
            <div className="m">{r.location}{r.cuisines.length ? ` · ${r.cuisines.join(", ")}` : ""}</div>
            <div className="o">{r.offers}</div>
            <div className="links">
              {r.opentable ? <a href={r.opentable} target="_blank" rel="noreferrer">RESERVE</a> : null}
              {r.menuUrl ? <a href={r.menuUrl} target="_blank" rel="noreferrer">MENU</a> : null}
              {r.website ? <a href={r.website} target="_blank" rel="noreferrer">SITE</a> : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function Chat() {
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "assistant", content: GREETING }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
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
        body: JSON.stringify({
          messages: next.map(({ role, content }) => ({ role, content })),
        }),
      });
      const data = await res.json();
      setMsgs((m) => [
        ...m,
        { role: "assistant", content: data.reply ?? "GAME OVER — SOMETHING BROKE. TRY AGAIN.", restaurants: data.restaurants ?? [] },
      ]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", content: "CONNECTION LOST. INSERT COIN AND TRY AGAIN." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="term pix">
        <div className="term-bar">
          CHEF-BOT v1.0 — NYC RESTAURANT WEEK TERMINAL
          <div className="lights">
            <span style={{ background: "var(--red)" }} />
            <span style={{ background: "var(--yellow)" }} />
            <span style={{ background: "var(--green)" }} />
          </div>
        </div>
        <div className="term-body" ref={bodyRef}>
          {msgs.map((m, i) => (
            <div key={i}>
              <div className={`line ${m.role === "user" ? "user" : "bot"}`}>{m.content}</div>
              {m.restaurants ? <Cards items={m.restaurants} /> : null}
            </div>
          ))}
          {busy ? (
            <div className="line sys">
              SEARCHING 612 RESTAURANTS<span className="blink">█</span>
            </div>
          ) : null}
        </div>
        <form
          className="term-form"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <input
            className="term-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="type your craving... e.g. italian dinner in the west village thursday"
            maxLength={400}
            aria-label="Ask about NYC Restaurant Week restaurants"
          />
          <button className="term-send" type="submit" disabled={busy}>
            {busy ? "..." : "SEND"}
          </button>
        </form>
      </div>
      <div className="chips">
        {CHIPS.map((c) => (
          <button className="chip" key={c} onClick={() => send(c)} disabled={busy}>
            {c}
          </button>
        ))}
      </div>
    </>
  );
}
