"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { PERMITTED_CLIENTS } from "./clients-data";

// PRD section 2 — Trusted by: a thin CSS marquee between the nav bar
// and the hero. Renders only when at least one written client
// permission is on file; otherwise absent with no gap.
// Without JS the loop still runs (CSS) and reduced motion still gets a
// static row; only the pause button needs JS.
export function TrustedByMarquee() {
  const [paused, setPaused] = useState(false);
  if (PERMITTED_CLIENTS.length === 0) return null;

  // alphabetical at render, so order never implies rank
  const clients = [...PERMITTED_CLIENTS].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  // one copy of the track; rendered twice for the seamless -50% loop.
  // Each copy carries pr equal to its internal gap, so -50% is exact.
  const track = (hidden: boolean) => (
    <ul
      aria-hidden={hidden ? true : undefined}
      className="flex w-max shrink-0 items-center gap-10 pr-10"
    >
      {clients.map((client) => (
        <li
          key={client.name}
          className="flex items-center whitespace-nowrap font-mono text-sm text-muted-foreground"
        >
          {client.logo ? (
            /* alt carries the name so it survives without the image */
            <Image
              src={client.logo}
              alt={client.name}
              width={96}
              height={24}
              className="h-6 w-auto"
              unoptimized
            />
          ) : (
            client.name
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <section
      aria-label="Trusted by"
      className="group border-b border-(--border) bg-(--background-lv1)"
    >
      <div className="container mx-auto flex items-center gap-6 px-4 py-3">
        <h2 className="shrink-0 font-mono text-xs text-muted-foreground">
          Trusted by
        </h2>
        <div className="min-w-0 flex-1 overflow-hidden">
          {/* ponytail: 60s linear is a guess; tune speed by feel */}
          <div className={cn("flex w-max marquee-track", paused && "marquee-paused")}>
            {track(false)}
            {track(true)}
          </div>
        </div>
        {/* pause control is dev-only (owner: production ships without it;
            hover/focus pausing and reduced motion still apply) */}
        {process.env.NODE_ENV !== "production" && (
          <button
            type="button"
            aria-pressed={paused}
            onClick={() => setPaused((p) => !p)}
            className="shrink-0 font-mono text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {paused ? "Resume" : "Pause"}
          </button>
        )}
      </div>
    </section>
  );
}
