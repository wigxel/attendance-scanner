"use client";

import Image from "next/image";
import { type ReactNode, type RefObject, useLayoutEffect, useRef } from "react";
import { CountValue } from "@/components/creative/counter-value";
import { cn } from "@/lib/utils";
// Calibration knobs and the imperative spotlight controller live in
// ./spotlight-controller; this file renders the shell they drive.
import {
  clipFor,
  createSpotlightController,
  SPOTLIGHT_BOUNDARY_RANGE_PX,
  SPOTLIGHT_DEBUG,
} from "./spotlight-controller";
import { TRIBES } from "./tribes";

type TribeId = (typeof TRIBES)[number]["id"];

type Leader = {
  tribeName: string; // display name, mirrors TRIBES[i].name
  jobTitle: string; // role shown next to the tribe label
  bio: string; // one-sentence draft; owner edits per person
  shortBio?: ReactNode; // longer bio (JSX), owner-supplied
  name: string;
  photo?: string; // real headshot only, path under /public
  tribeImage?: string; // tribe logo, under /images/tribes — shown when no headshot
  tier?: "Member" | "Verified"; // a Visitor cannot lead; default Verified
  proof?: ReadonlyArray<{ label: string; href: string }>; // ≤2 real links
};

// A tribe can have several leaders; order here is the display order.
const LEADERS: Array<Leader & { tribe: TribeId }> = [
  {
    tribe: "tribe-web-dev",
    tribeName: "Software Engineering",
    name: "Joseph Julius Owonvwon",
    jobTitle: "Software Engineer",
    bio: "Builds and reviews the community's websites and internal tools, and signs off client work before it ships.",
    photo: "/images/leaders/joseph-owonvwon.webp",
    tribeImage: "/images/tribes/tribe-web-dev.svg",
    tier: "Verified",
    proof: [{ label: "Github", href: "https://github.com/…" }],
  },
  {
    tribe: "tribe-design",
    tribeName: "Design",
    name: "Henry Ephriam",
    jobTitle: "3D Animator",
    bio: "Designs the community's identity and interfaces; keeps every maker project looking considered, from event posters to product screens.",
    photo: "/images/leaders/henry__.webp",
    tribeImage: "/images/tribes/tribe-design.svg",
    tier: "Verified",
    proof: [{ label: "Github", href: "https://github.com/…" }],
  },
  {
    tribe: "tribe-design",
    tribeName: "Design",
    name: "Divine Igiran",
    jobTitle: "Creative Designer/Architect",
    bio: "Works across interface and print; turns rough maker ideas into clear layouts, screens and brand materials people can use.",
    photo: "/images/leaders/divine.webp",
    tribeImage: "/images/tribes/tribe-design.svg",
    tier: "Verified",
    proof: [{ label: "Github", href: "https://github.com/…" }],
  },
  {
    tribe: "tribe-additive-manufacturing",
    tribeName: "Additive Manufacturing",
    name: "Dr. Fidelis Saleh",
    jobTitle: "Mechanical Engineer",
    bio: "Leads the Additive Manufacturing tribe; reviews printed parts against one question — made for real use, or for display.",
    photo: "/images/leaders/fidelis-live.webp",
    tribeImage: "/images/tribes/tribe-additive-manufacturing.svg",
    tier: "Verified",
    shortBio: (
      <span>
        I am a Mechanical Engineer and PhD researcher at Volgograd State
        Technical University (VolgSTU), Russia, specializing in the automation
        of production processes and advanced manufacturing technologies. I hold
        Bachelor&apos;s and Master&apos;s degrees in Automation of Production
        Processes and am currently pursuing doctoral research on the development
        and optimization of 3D-printed polymer gears reinforced with continuous
        carbon fibre. My professional experience includes production management,
        quality control, polymer processing, and industrial automation. I have
        worked in the manufacturing of woven polypropylene products and quality
        testing of PVC, HDPE, and LDPE materials. My research and professional
        interests include additive manufacturing, composite materials,
        mechanical engineering, production automation, and innovative
        manufacturing technologies.
      </span>
    ),
    proof: [
      {
        label: "LinkedIn",
        href: "https://www.linkedin.com/in/fidelis-saleh-789322226",
      },
    ],
  },
  {
    tribe: "tribe-additive-manufacturing",
    tribeName: "Manufacturing",
    name: "Joseph Ogbonna",
    jobTitle: "Electronics Engineer",
    photo: "/images/leaders/joseph-ogbonna.webp",
    bio: "Designs and programs hardware, from initial concept to functional prototypes, ensuring reliable and robust electronic solutions for the community.",
    tribeImage: "/images/tribes/tribe-additive-manufacturing.svg",
    tier: "Verified",
    proof: [
      {
        label: "LinkedIn",
        href: "https://www.linkedin.com/in/joseph-ogbonna-pcb",
      },
    ],
  },
  {
    tribe: "tribe-ml-ai",
    tribeName: "ML/AI",
    name: "Mark Odike",
    jobTitle: "Machine Learning Engineer",
    bio: "Runs AI project nights and reviews model work; what ships is measured against a baseline, not against a demo.",
    photo: "/images/leaders/joseph-owonvwon.webp",
    tribeImage: "/images/tribes/tribe-ml-ai.svg",
    tier: "Verified",
    proof: [{ label: "github.com/…", href: "https://github.com/" }],
  },
  {
    tribe: "tribe-blockchain",
    tribeName: "Blockchain",
    name: "Dominion Ekpuk",
    jobTitle: "Software Engineer",
    bio: "Builds with chains where a ledger genuinely earns its place; keeps the tribe honest about complexity for its own sake.",
    photo: "/images/leaders/joseph-owonvwon.webp",
    tribeImage: "/images/tribes/tribe-blockchain.svg",
    tier: "Verified",
    proof: [{ label: "Github", href: "https://github.com/dominion77" }],
  },
  {
    tribe: "tribe-qa",
    tribeName: "Quality Assurance",
    name: "Chisaneme Aloni",
    jobTitle: "Technical Writer",
    bio: "I ensure all product User Experience makes sense across the community",
    shortBio: (
      <p>
        Technical writer with experience in API and developer documentation for
        SaaS, fintech, and AI products. Skilled in OpenAPI, Docs-as-Code
        workflows, and building interactive API references from real tested
        requests. Active open source documentation contributor with an
        engineering background, focused on making complex systems accessible to
        developers.
      </p>
    ),
    photo: "/images/leaders/chisaneme.webp",
    tribeImage: "/images/tribes/tribe-qa.svg",
    tier: "Verified",
    proof: [{ label: "Github", href: "https://github.com/alachi77" }],
  },
];

type Entry = {
  tribe: (typeof TRIBES)[number];
  leader: Leader & { tribe: TribeId };
};

type SpotlightProps = {
  entries: ReadonlyArray<Entry>;
  clips: RefObject<(HTMLDivElement | null)[]>;
  frameRef: RefObject<HTMLDivElement | null>;
};

// Renders the static shell once; every dynamic change (active index, clip
// paths, debug line) is written straight to the DOM by the controller in
// ./spotlight-controller — scroll never touches React state, so no
// reconciliation runs.
function Spotlight({ entries, clips, frameRef }: SpotlightProps) {
  return (
    <div className="flex flex-col gap-4 max-lg:hidden sticky top-(--header-height)">
      <div
        ref={(el) => {
          frameRef.current = el;
        }}
        className={cn(
          "relative aspect-4/5 overflow-hidden bg-back",
          SPOTLIGHT_DEBUG && "outline outline-green-500",
        )}
      >
        {entries.map(({ tribe, leader }, i) => (
          <div
            key={`${tribe.id}:${leader.name}`}
            ref={(el) => {
              clips.current[i] = el;
            }}
            aria-hidden={i !== 0}
            className="absolute inset-0 scale-[1.1] transform overflow-hidden transition-[clip-path] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
            style={{
              clipPath: clipFor(i, 0),
              zIndex: entries.length - i,
            }}
          >
            <Image
              src={leader.photo ?? ""}
              alt={`Portrait of ${leader.name}`}
              fill
              loading="eager"
              fetchPriority="high"
              sizes="(min-width: 1024px) 33vw, 100vw"
              className="object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function tribeById(id: TribeId) {
  return TRIBES.find((candidate) => candidate.id === id);
}

/** One leader in the stacked list: tribe label in its colour, name, bio. */
function LeaderCard({ leader }: { leader: Leader & { tribe: TribeId } }) {
  return (
    <div className="flex flex-col gap-4 text-[1em]">
      <h4 className="leading-[1em]">{leader.name}</h4>
      <p className="">{leader.bio}</p>
    </div>
  );
}

export function LeadersSection() {
  const named: Entry[] = LEADERS.flatMap((leader) => {
    const tribe = tribeById(leader.tribe);
    return tribe ? [{ tribe, leader }] : [];
  });

  const hasPhotos = named.some(({ leader }) => Boolean(leader.photo));

  // Activation: a card is active while its box overlaps the boundary band —
  // the sticky spotlight frame's top edge, extended SPOTLIGHT_BOUNDARY_RANGE_PX
  // down. When a card's box leaves the band it goes inactive — wipes up (past)
  // or stays hidden (not yet arrived) — and the next one takes over. All of
  // it lives in the imperative controller — scroll never re-renders React.
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const clipRefs = useRef<(HTMLDivElement | null)[]>([]);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const counterRef = useRef<HTMLDivElement | null>(null);
  const activeNameRef = useRef<HTMLDivElement | null>(null);
  const activeTitleRef = useRef<HTMLDivElement | null>(null);
  const debugLineRef = useRef<HTMLDivElement | null>(null);

  // Minimal per-index data the controller needs to paint the active name.
  const meta = named.map(({ leader, tribe }) => ({
    label: leader.tribeName,
    color: tribe.color,
    jobTitle: leader.jobTitle,
  }));

  useLayoutEffect(() => {
    const controller = createSpotlightController({
      clips: clipRefs,
      cards: cardRefs,
      frame: frameRef,
      counter: counterRef,
      activeName: activeNameRef,
      activeTitle: activeTitleRef,
      meta,
      debugLine: debugLineRef,
      count: named.length,
      debug: SPOTLIGHT_DEBUG,
    });
    return () => controller.destroy();
  }, [named.length]);

  return (
    <div className="bg-background py-24 text-2xl font-thin">
      {SPOTLIGHT_DEBUG && (
        <div
          ref={debugLineRef}
          aria-hidden
          className="pointer-events-none fixed inset-x-0 top-0 z-50"
        >
          <div
            className="bg-red-500/20 outline outline-red-500"
            style={{ height: SPOTLIGHT_BOUNDARY_RANGE_PX }}
          />
          <span
            data-boundary-label
            className="absolute right-4 top-1 rounded bg-red-500 px-1.5 py-0.5 font-mono text-[10px] leading-none text-white"
          />
        </div>
      )}

      <div className="container flex flex-col mx-auto sticky top-0 px-4 gap-12 py-24">
        <h2 className={cn("font-heading font-black text-3xl md:text-6xl")}>
          Tribe leaders
        </h2>
      </div>

      <div
        className={
          "flex container relative mx-auto [--tribe-l-gap:--spacing(5)] gap-(--tribe-l-gap) items-start px-4 min-h-screen"
        }
      >
        <div className="flex basis-7/12 self-end gap-(--tribe-l-gap) sticky bottom-8">
          <div className="basis-5/12">
            {hasPhotos && (
              <Spotlight entries={named} clips={clipRefs} frameRef={frameRef} />
            )}
          </div>

          <span className="flex flex-1 justify-between flex-col leading-4">
            <span className="inline-flex item-start h-[1em] self-end font-thin overflow-hidden">
              <CountValue index={0} />
              <CountValue ref={counterRef} index={1} />
            </span>

            <div className="flex flex-col gap-3">
              <div ref={activeTitleRef}>{meta[0].jobTitle}</div>
              <div ref={activeNameRef} className="text-muted-foreground">
                {meta[0].label}
              </div>
            </div>
          </span>
        </div>

        <div className="basis-5/12 flex flex-col gap-32">
          {named.map((entry, i) => (
            <div
              key={`${entry.tribe.id}:${entry.leader.name}`}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              className="transition-opacity duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
            >
              <LeaderCard leader={entry.leader} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
