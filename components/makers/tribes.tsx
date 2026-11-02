import Image from "next/image";
import { heading } from "@/app/font";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Section 3 splits in two: this file carries both the landing teaser
// (TribesSection) and the detail page content (TribesDetail, rendered at
// /makers/tribes). Copy is a DRAFT written from the PRD's rules — owner
// review pending (no fake numbers, no income promises, "paid" only in FAQ).

export const TRIBES = [
  {
    id: "tribe-ml-ai",
    name: "ML/AI",
    color: "#f59e0b",
    description:
      "Models, agents and AI features — built inside other tribes' projects as well as on their own.",
  },
  {
    id: "tribe-additive-manufacturing",
    name: "Additive Manufacturing",
    color: "#8b5cf6",
    description:
      "Printed parts, enclosures and hardware prototypes, made for real use rather than for display.",
  },
  {
    id: "tribe-web-dev",
    name: "Web Dev",
    color: "#0ea5e9",
    description:
      "The websites and tools the community runs on, and the client work that pays for them.",
  },
  {
    id: "tribe-gaming",
    name: "Gaming",
    color: "#ec4899",
    description:
      "Small finished games from jams and build nights, shipped rather than shelved.",
  },
  {
    id: "tribe-blockchain",
    name: "Blockchain",
    color: "#10b981",
    description:
      "Contracts and integrations, introduced where a ledger genuinely earns its place.",
  },
] as const;

function SubHeading({ children }: { children: string }) {
  return (
    <h3
      className={cn(
        heading.className,
        "tracking-tight text-xl text-pretty md:text-2xl",
      )}
    >
      {children}
    </h3>
  );
}

export function ApplyLink() {
  // real form opens in a modal — batch F. #contact is the makers footer
  // (components/makers/footer.tsx), wired in batch E.
  return (
    <Button asChild size="lg">
      <a href="#contact">Apply to join</a>
    </Button>
  );
}

// 3.3 — a real sequence, so the numbering is information
const STEPS: ReadonlyArray<readonly [string, string]> = [
  [
    "Apply",
    "Tell us who you are and show something you have built — deployed, published or printed.",
  ],
  [
    "Show up",
    "Come to a tribe meeting as a visitor and meet the members of the tribe you fit closest.",
  ],
  [
    "Get verified",
    "Pass a project review: two Tribe Leaders check work you have already shipped against the community standard.",
  ],
  [
    "Build",
    "Join build teams on real projects for real organisations, delivered under a named Build Lead.",
  ],
];

// 3.7
const FAQ: ReadonlyArray<readonly [string, string]> = [
  [
    "Do I need to live in Lagos?",
    "No. Meetings are where the community happens, and if the location does not suit you, join the session online — verification happens over a call if you are based outside.",
  ],
  [
    "What does verification actually check?",
    "Work you have already shipped, and the standard it was built to. Two Tribe Leaders review the work and confirm the tier.",
  ],
  [
    "Do members get paid?",
    "Inspace Makers does not promise income, placement or a job. When the community delivers client work, the build team on that project gets paid for it; community projects, meetings and workshops are done free.",
  ],
  [
    "Is membership really free?",
    "Yes. Joining is free and verification is free. What gates access is verification, not money.",
  ],
  [
    "I study full-time. Can I still take part?",
    "Yes. Attendance is what keeps you in the room, and one meeting a month fits round a student timetable.",
  ],
  [
    "What do I need to apply?",
    "Your name, the tribe you sit closest to, and something you have built — deployed, published or printed.",
  ],
];

// Shared section copy — all layout variants below render these + the grid.
// Owner edits copy here once; layout lives in each variant module.
export function TribesIntro() {
  return (
    <p className="max-w-[60ch] text-muted-foreground">
      Members meet in tribes to build, show and check work against a shared
      standard. Pick yours and start with a visit.
    </p>
  );
}

export function TribesCloser() {
  return (
    <div className="flex max-w-3xl flex-col items-start gap-5">
      <ApplyLink />
      <p className="font-mono text-sm">
        Free to join. Verified to build.{" "}
        <a
          href="/makers/tribes"
          className="ml-3 underline underline-offset-4 hover:text-foreground"
        >
          How verification works
        </a>
      </p>
    </div>
  );
}

// Variant A — "the cadastre": full-width squares, hairline border, mono
// index; the logo carries the colour, nothing else decorates. No hard
// counts in copy anywhere (owner rule: counts go stale with every tribe).
export function TribesSection() {
  return (
    <div className="flex flex-col gap-16">
      <TribesIntro />

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TRIBES.map((tribe, i) => (
          <li
            key={tribe.id}
            id={tribe.id}
            className="relative flex aspect-square scroll-mt-24 flex-col border border-(--border) p-6 md:p-8"
          >
            {/* placeholder logos live in public/images/tribes/<id>.svg —
                  drop the real logo at the same path, no code change */}
            <Image
              src={`/images/tribes/${tribe.id}.svg`}
              alt=""
              width={40}
              height={40}
              className="size-10 rounded-none md:size-12"
            />
            <p
              className={cn(
                heading.className,
                "mt-auto text-2xl tracking-tight text-pretty md:text-3xl",
              )}
            >
              {tribe.name}
            </p>
            <p className="mt-2 text-sm font-normal text-pretty text-muted-foreground">
              {tribe.description}
            </p>
            <span
              aria-hidden
              className="absolute top-6 right-6 font-mono text-xs text-muted-foreground md:top-8 md:right-8"
            >
              /0{i + 1}
            </span>
          </li>
        ))}

        {/* sixth cell: an open slot, not a tribe. The caption is the claim
              (attitude, not mechanism); the href is the route — mailto until
              batch E/F puts the real contact form in. */}
        <li className="contents">
          <a
            href="mailto:business@inspace.ng?subject=I%20would%20like%20to%20start%20and%20lead%20a%20tribe"
            className="flex aspect-square flex-col border border-dashed border-(--border) p-6 hover:border-foreground hover:bg-(--background-lv1) md:p-8"
          >
            <p
              className={cn(
                heading.className,
                "mt-auto text-2xl tracking-tight text-pretty md:text-3xl",
              )}
            >
              We have room for more.
            </p>
            <p className="mt-2 text-sm font-normal text-pretty text-muted-foreground">
              Propose a tribe
            </p>
          </a>
        </li>
      </ul>

      <TribesCloser />
    </div>
  );
}

// /makers/tribes: PRD sub-blocks 4.3–4.7
export function TribesDetail() {
  return (
    <div className="flex max-w-3xl flex-col gap-16">
      <p className="text-lg text-pretty text-muted-foreground">
        Showing up gets you in the room. Being verified gets you on a build
        team. This is the path, and what each stage asks of you.
      </p>

      {/* 3.3 How it works */}
      <div className="flex flex-col gap-6">
        <SubHeading>How it works</SubHeading>
        <ol className="flex flex-col gap-4">
          {STEPS.map(([title, body], i) => (
            <li key={title} className="flex items-baseline gap-4">
              <span
                aria-hidden
                className="font-mono text-sm text-muted-foreground"
              >
                /0{i + 1}
              </span>
              <p>
                <span className="font-medium">{title}</span>{" "}
                <span className="text-muted-foreground">{body}</span>
              </p>
            </li>
          ))}
        </ol>
      </div>

      {/* 3.4 Verification tiers — public and they follow you */}
      <div className="flex flex-col gap-6">
        <SubHeading>Verification tiers</SubHeading>
        <p className="text-muted-foreground">
          Your tier is public and follows you. It moves on proof of work, not on
          time served.
        </p>
        <ul className="flex flex-col divide-y divide-(--border) border-y border-(--border)">
          <li className="flex flex-col gap-1 py-5">
            <p className="font-medium">Visitor</p>
            <p className="text-muted-foreground">
              In the room at a meeting, on invitation. Not on the register.
            </p>
          </li>
          <li className="flex flex-col gap-1 py-5">
            <p className="font-medium">Member</p>
            <p className="text-muted-foreground">
              On the register and attending meetings. Can contribute to
              community projects and apply for verification.
            </p>
          </li>
          <li className="flex flex-col gap-1 py-5">
            <p className="font-medium">
              Verified{" "}
              <span aria-hidden className="text-muted-foreground">
                — the tier on build teams
              </span>
            </p>
            <p className="text-muted-foreground">
              Project work confirmed against the standard, with project credits
              attached to your record. The only tier build teams draw from.
            </p>
          </li>
        </ul>
      </div>

      {/* 3.5 Membership — "free" is always paired with verification */}
      <div className="flex flex-col gap-6">
        <SubHeading>Membership</SubHeading>
        <p className="text-muted-foreground">
          Membership is free. What you pay in is attendance — a first meeting,
          then the meetings after that — and verification when you are ready for
          it. Verification free of charge, decided on your work alone.
        </p>
      </div>

      {/* 3.6 Visit first */}
      <div className="flex flex-col gap-4">
        <SubHeading>Visit first</SubHeading>
        <p className="text-muted-foreground">
          Apply only after a first look. Come to a meeting as a visitor, see the
          work up close and meet the tribe you would join — a member can invite
          you, or say so in your application note and we will bring the next
          meeting to you.
        </p>
      </div>

      {/* 3.7 Questions builders ask */}
      <div className="flex flex-col gap-6">
        <SubHeading>Questions builders ask</SubHeading>
        <dl className="flex flex-col divide-y divide-(--border) border-y border-(--border)">
          {FAQ.map(([question, answer]) => (
            <div key={question} className="flex flex-col gap-1 py-5">
              <dt className="font-medium">{question}</dt>
              <dd className="text-muted-foreground">{answer}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* the section ends on the button — nobody scrolls back up to act */}
      <div>
        <ApplyLink />
      </div>
    </div>
  );
}
