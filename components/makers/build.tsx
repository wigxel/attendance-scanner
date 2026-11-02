import Image from "next/image";
import { heading } from "@/app/font";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PERMITTED_CLIENTS } from "./clients-data";
import { TRIBES } from "./tribes";

// Section 5 — clients and partners, distinct audience from section 4.
// Copy is a DRAFT from the PRD's client messages — owner review pending.
// PRD rules held here: no income promises ("paid"/"earn"/"income" appear
// only in the section 3 developer FAQ), no client names, nothing fake.

// Layout: Müller-Brockmann grid per /grid-system — 6 tracks: a 16ch
// annotation field + 5 content fields. Every block and every row uses the
// SAME fixed template, so annotation axis, title edge and body edge are
// identical verticals page-wide. Rhythm snaps to the site's existing
// 4px/8px module. Rules are single hairlines: block-top + divide-y, no
// doubles between adjacent blocks.

// 16ch margin + 5 fields, shared by every block and row
const GRID = "lg:grid-cols-[16ch_repeat(5,minmax(0,1fr))]";

// Margin-axis H3 annotation — the tag doubles as the sub-block heading.
function Tag({
  className,
  children,
}: {
  className?: string;
  children: string;
}) {
  return (
    <h3 className={cn("font-mono text-xs text-muted-foreground", className)}>
      {children}
    </h3>
  );
}

// Prose content spanning the 5 fields, starting past the margin axis
function Field({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-5 lg:col-span-5 lg:col-start-2",
        className,
      )}
    >
      {children}
    </div>
  );
}

// A ruled block: Tag on the margin axis, children fill the tracks.
function Block({
  id,
  tag,
  className,
  children,
}: {
  id: string;
  tag: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn(
        "grid scroll-mt-16 gap-x-8 gap-y-1 border-t border-(--border) pt-8",
        GRID,
        className,
      )}
    >
      <Tag>{tag}</Tag>
      {children}
    </section>
  );
}

function HireButton({ className }: { className?: string }) {
  // real enquiry form opens in a modal — batch F; mailto is real and
  // works in the meantime (same precedent as the tribe-lead mailto)
  return (
    <Button asChild size="lg" className={className}>
      <a href="mailto:business@inspace.ng?subject=Build%20team%20enquiry">
        Hire a build team
      </a>
    </Button>
  );
}

// 5.3 rides on TRIBES so a tribe rename is one edit. No hard "five" in
// copy (owner rule: counts go stale).
const CLAIMS: ReadonlyArray<readonly [string, string]> = [
  [
    "Named accountability",
    "One Build Lead is reachable and accountable from first enquiry to handover.",
  ],
  [
    "A verified team",
    "Everyone on the build team has passed project review against the community standard.",
  ],
  [
    "Work, checked twice",
    "Tribe Leaders outside the build team review the delivery before anything ships.",
  ],
];

// 5.4 — the sequence a client actually walks through; numbering is the
// information, on the margin axis like every other annotation
const ENGAGEMENT: ReadonlyArray<readonly [string, string]> = [
  [
    "Enquiry",
    "Tell us what the problem is and what done looks like. A direct talk, not a pitch deck.",
  ],
  [
    "Build Lead",
    "A named builder takes accountability for delivery — one person the client can reach, for the whole engagement.",
  ],
  [
    "Scope",
    "The work is written down: what ships, what standard it meets, what the timeline is. Nothing starts before both sides agree it.",
  ],
  [
    "Delivery",
    "The build team ships, and the work is reviewed against the same community standard members are verified on.",
  ],
];

// 5.7
const FAQ: ReadonlyArray<readonly [string, string]> = [
  [
    "Who works on our project?",
    "A build team drawn from verified members, led by a named Build Lead. Verification is what earns a seat on a team, so the floor of competence is set before your project starts.",
  ],
  [
    "What if the work is not what we agreed?",
    "The Build Lead is accountable from first enquiry to handover. The scope is written down before work starts, and the final review is against that scope plus the community standard.",
  ],
  [
    "How big can a project be?",
    "Engagements scale from a working prototype to a delivered product, within the community's capabilities. The scope conversation will tell you quickly what fits.",
  ],
  [
    "What standards do you build to?",
    "The same one members are verified against: work that is deployed where it should be, documented so it can be maintained, and reviewed by Tribe Leaders outside the build team.",
  ],
  [
    "Can we keep the work in-house afterwards?",
    "Yes. Ownership per your requirements, and the handover includes the documentation to maintain it without us.",
  ],
];

// 5.5 — real artefacts only. Empty until the community publishes real
// work (PRD: nothing that is not real on the day it is shown). Batch D
// owns this list; the block renders only while non-empty.
const ARTEFACTS: ReadonlyArray<readonly [string, string, string]> = [];

const ON_THIS_PAGE = [
  { href: "#capabilities", label: "Capabilities" },
  { href: "#engagement", label: "Engagement" },
  { href: "#partners", label: "Partners" },
  { href: "#questions", label: "Questions" },
] as const;

// Landing #build: full-bleed poster section. The image fills 100vh;
// text sits on a black scrim, top-left and bottom-left anchored. Replace
// /images/makers/build-with.svg with a real photo of members at work
// (≤120 KB, PRD rule); until then the SVG is a neutral placeholder.
export function BuildSection() {
  return (
    <div className="relative h-[calc(100vh-4rem)] overflow-hidden">
      <Image
        src="/images/makers/build-with.svg"
        alt=""
        fill
        unoptimized
        loading="lazy"
        className="object-cover"
        sizes="100vw"
      />
      {/* black scrim — text is the only thing that lives here, so the
          gradient is dense at the top where the H2 is, lighter below */}
      <div
        aria-hidden
        className="absolute inset-0 bg-linear-to-b from-black/70 via-black/30 to-transparent"
      />
      <h2
        className={cn(
          heading.className,
          "absolute left-6 top-6 z-10 max-w-[20ch] text-3xl tracking-tighter text-white md:left-10 md:top-10 md:text-5xl",
        )}
      >
        Build with Inspace Makers
      </h2>

      <div className="absolute bottom-6 left-6 z-10 flex max-w-[52ch] flex-col items-start gap-5 md:bottom-10 md:left-10">
        <p className="font-mono text-xs text-white/70">For organisations</p>
        <p className="text-lg text-pretty text-white/90">
          A build team of verified members delivers software, AI, hardware and
          games for organisations, under a named Build Lead.
        </p>
        <Button asChild size="lg">
          <a href="/makers/build">See what a build team delivers</a>
        </Button>
      </div>
    </div>
  );
}

// /makers/build — the dedicated client page. PRD sub-blocks 5.1–5.7 on
// the block grid.
export function BuildDetail() {
  return (
    <div className="flex flex-col gap-8">
      {/* page hero — content field; margin carries audience tag + ToC */}
      <div className={cn("grid gap-x-8 gap-y-6 pt-2", GRID)}>
        <div className="flex flex-col items-start gap-6 max-lg:hidden">
          <Tag>For organisations</Tag>
          <nav
            aria-label="On this page"
            className="flex flex-col gap-2 font-mono text-xs text-muted-foreground"
          >
            {ON_THIS_PAGE.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
        {/* mobile: the tag travels inside the content flow */}
        <Tag className="lg:hidden">For organisations</Tag>
        <Field className="gap-6">
          <h1
            className={cn(
              heading.className,
              "tracking-tighter text-4xl text-pretty sm:text-5xl md:text-6xl",
            )}
          >
            Build with Inspace Makers.
          </h1>
          {/* 5.1 The offer */}
          <p className="max-w-[56ch] text-pretty text-muted-foreground">
            When an organisation needs software, AI, additive manufacturing,
            games or blockchain built, a build team of verified members delivers
            it under a named Build Lead. You are buying a competence floor, not
            a freelancer lottery.
          </p>
          <div>
            <HireButton />
          </div>
        </Field>
      </div>

      {/* PRD 5.2 Clients — a name shows only with written permission on
          file; while none is, the block holds the fallback line only.
          Each card would link to its project in 5.5 where one exists. */}
      <Block id="clients" tag="Clients">
        {PERMITTED_CLIENTS.length > 0 ? (
          <ul className="flex flex-col gap-y-2 lg:col-span-6 lg:col-start-1">
            {PERMITTED_CLIENTS.map((client) => (
              <li
                key={client.name}
                className={cn(
                  "grid items-baseline gap-x-8 gap-y-2 border-t border-(--border) py-4 first:border-t-0",
                  GRID,
                )}
              >
                <span className="font-medium lg:col-span-2">{client.name}</span>
                <span className="font-mono text-xs text-muted-foreground lg:col-span-1">
                  {client.sector}
                </span>
                <span className="text-muted-foreground lg:col-span-2">
                  {client.line}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Field>
            {/* owner-verify these sectors are real before publish — same
                real-only rule as everything else on the page */}
            <p className="max-w-[56ch] text-pretty text-muted-foreground">
              Build teams have delivered for organisations across fintech,
              health, education and the public sector.
            </p>
          </Field>
        )}
      </Block>

      {/* three real client claims, same-width cells, hairline-divided:
          the one loud block — size carries importance (grid rule) */}
      <Block id="claims" tag="What you get">
        <Field>
          <ul className="grid gap-6 md:grid-cols-3 md:divide-x md:divide-(--border)">
            {CLAIMS.map(([title, body]) => (
              <li
                key={title}
                className="flex flex-col gap-2 md:px-6 md:first:pl-0"
              >
                <span className="font-mono text-xs text-muted-foreground">
                  {title}
                </span>
                <p className="text-pretty text-muted-foreground">{body}</p>
              </li>
            ))}
          </ul>
        </Field>
      </Block>

      {/* 5.3 Capabilities — dot on the margin axis, name fields 1–2,
          description fields 3–5; edges coincide with every other block */}
      <Block id="capabilities" tag="Capabilities">
        <ul
          className={cn("flex flex-col gap-y-2 lg:col-span-6 lg:col-start-1")}
        >
          {TRIBES.map((tribe) => (
            <li
              key={tribe.id}
              className={cn(
                "grid items-baseline gap-x-8 gap-y-2 border-t border-(--border) py-4 first:border-t-0",
                GRID,
              )}
            >
              <span
                aria-hidden
                className="size-2.5 shrink-0 self-start rounded-full max-lg:hidden"
                style={{ backgroundColor: tribe.color }}
              />
              <span className="font-medium lg:col-span-2">{tribe.name}</span>
              <span className="text-muted-foreground lg:col-span-3">
                {tribe.description}
              </span>
            </li>
          ))}
        </ul>
      </Block>

      {/* 5.4 How an engagement runs — numbers on the margin axis */}
      <Block id="engagement" tag="How an engagement runs">
        <ol className="flex flex-col gap-y-2 lg:col-span-6 lg:col-start-1">
          {ENGAGEMENT.map(([title, body], i) => (
            <li
              key={title}
              className={cn(
                "grid items-baseline gap-x-8 gap-y-1 border-t border-(--border) py-4 first:border-t-0",
                GRID,
              )}
            >
              <span
                aria-hidden
                className="font-mono text-xs text-muted-foreground"
              >
                /0{i + 1}
              </span>
              <span className="font-medium lg:col-span-2">{title}</span>
              <span className="text-muted-foreground lg:col-span-3">
                {body}
              </span>
            </li>
          ))}
        </ol>
      </Block>

      {/* 5.5 Projects — hidden until real artefacts exist */}
      {ARTEFACTS.length > 0 && (
        <Block id="proof" tag="Proof">
          <ul className="flex flex-col gap-y-2 lg:col-span-6 lg:col-start-1">
            {ARTEFACTS.map(([title, detail, href]) => (
              <li
                key={title}
                className={cn(
                  "grid items-baseline gap-x-8 gap-y-1 border-t border-(--border) py-4 first:border-t-0",
                  GRID,
                )}
              >
                <a
                  href={href}
                  className="font-medium underline underline-offset-4 lg:col-span-2"
                >
                  {title}
                </a>
                <span className="text-muted-foreground lg:col-span-3">
                  {detail}
                </span>
              </li>
            ))}
          </ul>
        </Block>
      )}

      {/* 5.6 Partners and sponsors */}
      <Block id="partners" tag="Partners">
        <Field>
          <p className="max-w-[56ch] text-pretty text-muted-foreground">
            Hubs, accelerators, universities and grant makers: the community
            builds with you and covers the rest — contact{" "}
            <a
              href="mailto:business@inspace.ng?subject=Partnership"
              className="underline underline-offset-4 hover:text-foreground"
            >
              business@inspace.ng
            </a>
            .
          </p>
        </Field>
      </Block>

      {/* 5.7 Questions clients ask — question at the title edge, answer
          at the body edge; q/a read as aligned columns on lg */}
      <Block id="questions" tag="Questions">
        <dl className="flex flex-col gap-y-2 lg:col-span-6 lg:col-start-1">
          {FAQ.map(([question, answer]) => (
            <div
              key={question}
              className={cn(
                "grid items-baseline gap-x-8 gap-y-1 border-t border-(--border) py-4 first:border-t-0",
                GRID,
              )}
            >
              <dt className="font-medium lg:col-span-2">{question}</dt>
              <dd className="text-muted-foreground lg:col-span-3">{answer}</dd>
            </div>
          ))}
        </dl>
      </Block>

      {/* the ask at poster scale — the page ends on the button */}
      <section className={cn("grid items-center gap-x-8 gap-y-6 pt-10", GRID)}>
        <Tag>The ask</Tag>
        <Field className="gap-6">
          <p
            className={cn(
              heading.className,
              "tracking-tight text-3xl text-pretty md:text-5xl",
            )}
          >
            Bring us the problem. We will name the builder.
          </p>
          <HireButton className="w-fit" />
        </Field>
      </section>
    </div>
  );
}
