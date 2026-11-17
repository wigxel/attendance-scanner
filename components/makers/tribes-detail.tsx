import { heading } from "@/app/font";
import { cn } from "@/lib/utils";

import { ApplyLink } from "./tribes";

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

        <ul className="flex flex-col divide-y divide-border border-y border-border">
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
        <dl className="flex flex-col divide-y divide-border border-y border-border">
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
