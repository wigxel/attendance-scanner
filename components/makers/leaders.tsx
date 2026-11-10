"use client";

import { PlusIcon } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { heading } from "@/app/font";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TRIBES } from "./tribes";

type Leader = {
  name: string;
  photo?: string; // real headshot only, path under /public
  tier?: "Member" | "Verified"; // a Visitor cannot lead; default Verified
  proof?: ReadonlyArray<{ label: string; href: string }>; // ≤2 real links
};

const LEADERS: Partial<Record<(typeof TRIBES)[number]["id"], Leader>> = {
  "tribe-web-dev": {
    name: "Joseph Owonvwon",
    photo: "/images/leaders/joseph-owonvwon.webp",
    tier: "Verified",
    proof: [{ label: "Github", href: "https://github.com/…" }],
  },
  "tribe-additive-manufacturing": {
    name: "Fidelis Saleh",
    photo: "/images/leaders/joseph-owonvwon.webp",
    tier: "Verified",
    proof: [
      {
        label: "LinkedIn",
        href: "https://www.linkedin.com/in/fidelis-saleh-789322226",
      },
    ],
  },
  // @todo: a tribe can have multiple leaders
  // "tribe-additive-manufacturing": {
  //   name: "Joseph Ogbonna",
  //   photo: "/images/leaders/joseph-owonvwon.webp",
  //   tier: "Verified",
  //   proof: [{ label: "LinkedIn", href: "https://www.linkedin.com/in/joseph-ogbonna-pcb" }],
  // },
  "tribe-ml-ai": {
    name: "Mark Odike",
    photo: "/images/leaders/joseph-owonvwon.webp",
    tier: "Verified",
    proof: [{ label: "github.com/…", href: "https://github.com/" }],
  },
  "tribe-blockchain": {
    name: "Dominion Ekpuk",
    photo: "/images/leaders/joseph-owonvwon.webp",
    tier: "Verified",
    proof: [{ label: "Github", href: "https://github.com/dominion77" }],
  },
};

// What each leader does in the role, per tribe (4): one sentence, grounded
// in the tribe descriptions on the page. DRAFT — owner edits per person as
// they like; keyed by tribe so a leader entry never retypes it.
const TRIBE_DUTIES: Record<(typeof TRIBES)[number]["id"], string> = {
  "tribe-ml-ai":
    "Runs the AI project nights and signs off model work — what ships is measured against a baseline, not against a demo.",
  "tribe-additive-manufacturing":
    "Reviews printed parts against one question: was this made for use, or for display.",
  "tribe-web-dev":
    "Signs off the sites and tools the community runs on, and reviews the client builds before they ship.",
  "tribe-gaming":
    "Keeps build nights moving toward finished games — a jam that ships counts, a demo that stalls does not.",
  "tribe-blockchain":
    "Approves chain work only where a ledger genuinely earns its place.",
};

type Entry = {
  tribe: (typeof TRIBES)[number];
  leader: Leader;
};

function JoinLink({ tribeName }: { tribeName: string }) {
  // real form opens in a modal — batch F; mailto is real and works in the
  // meantime (same precedent as the build-team and tribe-proposal mailtos)
  return (
    <Button asChild variant="ghost" size="icon">
      <a
        title={`Join ${tribeName}`}
        href={`mailto:business@inspace.ng?subject=${encodeURIComponent(
          `Apply to join the ${tribeName} tribe`,
        )}`}
      >
        <PlusIcon className="size-[2rem]" strokeWidth={1} />
      </a>
    </Button>
  );
}

// One ledger row: photo slot / name / dot + tribe + tier / proof / duty.
// Handlers on the row drive the spotlight — hover, keyboard focus and tap
// all land on the same state.
function LeaderRow({
  tribe,
  leader,
  onActivate,
}: {
  tribe: Entry["tribe"];
  leader: Leader;
  onActivate: () => void;
}) {
  return (
    <li
      onMouseEnter={onActivate}
      onFocus={onActivate}
      onClick={onActivate}
      className="grid grid-cols-[auto_1fr] items-start gap-x-6 border-t border-(--border) py-6 hover:bg-(--background-lv1) md:grid-cols-[1fr_auto] md:px-2"
    >
      <div className="flex flex-col gap-1.5 flex-1">
        <p
          className={cn(
            heading.className,
            "text-2xl tracking-tight text-pretty md:text-3xl",
          )}
        >
          {leader.name}
        </p>

        <p className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
          <span
            aria-hidden
            className="size-2.5 rounded-full"
            style={{ backgroundColor: tribe.color }}
          />
          {tribe.name} · {leader.tier ?? "Verified"}
        </p>

        <p className="max-w-[52ch] text-sm text-pretty text-muted-foreground">
          {TRIBE_DUTIES[tribe.id]}
        </p>
      </div>

      <div className="max-md:col-span-2 md:pt-1">
        <div className="max-md:flex max-md:justify-start">
          <JoinLink tribeName={tribe.name} />
        </div>
      </div>
    </li>
  );
}

// The fixed frame in the 2:1 grid (desktop only): shows ONE leader at a
// time, never changes size. All leaders render stacked in the frame and
// crossfade via opacity — no library. Caption under the frame follows the
// active row: dot + tribe + tier, then that leader's proof links.
function Spotlight({
  entries,
  activeIdx,
}: {
  entries: ReadonlyArray<Entry>;
  activeIdx: number;
}) {
  const active = entries[activeIdx];

  return (
    <div className="flex flex-col gap-4 max-lg:hidden sticky top-(--header-height)">
      <div className="relative aspect-[4/5] overflow-hidden border border-(--border)">
        {entries.map(({ tribe, leader }, i) => (
          <div
            key={tribe.id}
            aria-hidden={i !== activeIdx}
            className={cn(
              "absolute inset-0 flex items-center justify-center transition-opacity duration-300",
              i === activeIdx ? "opacity-100" : "opacity-0",
            )}
          >
            {leader.photo ? (
              <Image
                src={leader.photo}
                alt={`Portrait of ${leader.name}`}
                fill
                sizes="(min-width: 1024px) 33vw, 100vw"
                className="object-cover"
              />
            ) : (
              <span
                className="font-mono text-3xl text-muted-foreground"
                aria-hidden
              >
                {leader.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")}
              </span>
            )}
          </div>
        ))}
      </div>

      <p className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
        <span
          aria-hidden
          className="size-2.5 rounded-full"
          style={{ backgroundColor: active.tribe.color }}
        />
        {active.tribe.name} · {active.leader.tier ?? "Verified"}
      </p>
      {active.leader.proof && active.leader.proof.length > 0 && (
        <p className="flex flex-wrap gap-x-4 font-mono text-xs text-muted-foreground">
          {active.leader.proof.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="underline underline-offset-4 hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </p>
      )}
    </div>
  );
}

export function LeadersSection() {
  const named: Entry[] = TRIBES.flatMap((tribe) => {
    const leader = LEADERS[tribe.id] as Leader | undefined;
    return leader ? [{ tribe, leader }] : [];
  });

  const [hovered, setHovered] = useState<number | null>(null);
  const activeIdx = Math.min(hovered ?? 0, named.length - 1);
  const hasPhotos = named.some(({ leader }) => Boolean(leader.photo));

  return (
    <div className="flex flex-col gap-10">
      {named.length > 0 ? (
        <div
          className={cn(
            "grid gap-10",
            hasPhotos &&
              "lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-x-12",
          )}
        >
          {hasPhotos && <Spotlight entries={named} activeIdx={activeIdx} />}
          <ul className="flex flex-col border-b border-(--border)">
            {named.map(({ tribe, leader }, i) => (
              <LeaderRow
                key={tribe.id}
                tribe={tribe}
                leader={leader}
                onActivate={() => setHovered(i)}
              />
            ))}
          </ul>
        </div>
      ) : (
        <p className="max-w-[60ch] text-pretty text-muted-foreground">
          Every tribe is led by one of its members. Leaders are named here as
          they take the role.
        </p>
      )}
    </div>
  );
}
