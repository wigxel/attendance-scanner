// /makers/logs — weekly logs, one page grouped by WEEK (owner rule):
// each week is a seven-day window from its start date, and inside it one
// row per tribe entry — the work summary and the active participants.
//
// DUMMY data below — logs move to Convex later (owner decision). The
// `LOGS` shape is the landing shape for that query, so the swap is a
// data import, not a layout rewrite.
import { addDays, parseISO } from "date-fns";
import { format } from "date-fns/format";

import { TRIBES } from "./tribes";

type TribeEntry = {
  tribeId: string;
  summary: string; // what the tribe shipped or moved forward that week
  participants: string[];
};

type Week = {
  weekStart: string; // ISO date — the week runs from here + 6 days
  entries: TribeEntry[];
};

const LOGS: ReadonlyArray<Week> = [
  {
    weekStart: "2026-10-11",
    entries: [
      {
        tribeId: "tribe-ml-ai",
        summary:
          "The first agent prototype was run against the review rubric by two Tribe Leaders outside the build team. It passed deployment and documentation checks; the evaluation harness needs a second pass before the tier review. Two jam participants joined the working sessions.",
        participants: ["Amara", "Kelechi"],
      },
    ],
  },
  {
    weekStart: "2026-09-20",
    entries: [
      {
        tribeId: "tribe-web-dev",
        summary:
          "Seating maps were rebuilt end to end against the community standard, which caught two unmaintained dependencies on the way. The booking export gained a dry-run mode so Admins can preview a move before committing it. Both changes went to staging for a Thursday check.",
        participants: ["Emeka", "Seyi"],
      },
      {
        // additional paragraph (owner: dummy copy — replace with real weeks
        // once Convex serves logs)
        tribeId: "tribe-additive-manufacturing",
        summary:
          "Enclosure sets were printed and fitted for the Node.IO E1 after two tolerance corrections on the lid. Spares were printed for the tribe shelf so a bent part never blocks a build night.",
        participants: ["Femi", "Tunde"],
      },
      {
        tribeId: "tribe-gaming",
        summary:
          "The jam prototype got its first outside playtest; notes were taken against the community standard rather than liked or retweeted.",
        participants: ["Bola"],
      },
    ],
  },
  {
    weekStart: "2026-09-13",
    entries: [
      {
        tribeId: "tribe-web-dev",
        summary:
          "The attendance scanner reports page shipped to staging with a booking export fix. The week closed with a review against the shared standard: one blocker remains on the reports filter, logged for the next week. Three members turned up for all working sessions.",
        participants: ["Chidera", "Emeka", "Ngozi"],
      },
    ],
  },
];

const timestamp = (iso: string) => parseISO(iso).getTime();

// seven-day window label: "13 – 19 Sep 2026"
const weekLabel = (weekStart: string) => {
  const start = parseISO(weekStart);
  return `${format(start, "d MMM")} – ${format(addDays(start, 6), "d MMM yyyy")}`;
};

const tribeOf = (tribeId: string) => TRIBES.find((tribe) => tribe.id === tribeId);

/*@todo: We should add pagination and log filter by tribe */
export function LogsContent() {
  if (LOGS.length === 0) {
    return (
      <p className="font-mono text-xs text-muted-foreground">No entries yet.</p>
    );
  }

  return (
    <div className="flex flex-col">
      {[...LOGS].sort((a, b) => timestamp(b.weekStart) - timestamp(a.weekStart)).map(
        (week) => (
          <section
            key={week.weekStart}
            id={`week-${week.weekStart}`}
            className="scroll-mt-16 py-8 flex items-start gap-4 border-t border-(--border)"
          >
            <h3 className="text-xs sticky top-(--header-height) uppercase py-5 font-mono font-medium basis-[40ch]">{weekLabel(week.weekStart)}</h3>
            <ul className="flex-1 flex flex-col divide-y divide-(--border)">
              {week.entries.map((entry) => {
                const tribe = tribeOf(entry.tribeId);

                return (
                  <li
                    key={entry.tribeId}
                    className="grid gap-x-12 gap-y-1 py-4 md:grid-cols-[0.6fr_1fr_0.6fr] md:items-baseline"
                  >
                    <div>
                      {tribe ? (
                        <span className="flex items-center gap-2 font-medium">
                          {/* PRD: tribe colours first shown in the hero strip,
                            reused here */}
                          <span
                            aria-hidden
                            className="size-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: tribe.color }}
                          />
                          {tribe.name}
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-muted-foreground">
                          {entry.tribeId}
                        </span>
                      )}</div>

                    <p className="text-pretty text-muted-foreground">
                      {entry.summary}
                    </p>

                    <p className="font-mono text-xs text-muted-foreground">
                      {entry.participants.join(" · ")}
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>
        ),
      )}
    </div>
  );
}
