"use client";
import { useQuery } from "convex/react";
import { format, parseISO } from "date-fns";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  type LucideIcon,
  MinusCircle,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

type Status = "done" | "missed" | "neglected" | "pending";

type LogItem = {
  kind: "preset" | "instance";
  title: string;
  cadence?: "daily" | "weekly" | "monthly";
  points: number;
  status: Status;
  completedAt: number | null;
};

type LogDay = {
  date: string;
  earned: number;
  available: number;
  items: LogItem[];
};

const STATUS_META: Record<
  Status,
  { label: string; icon: LucideIcon; className: string }
> = {
  done: {
    label: "Done",
    icon: CheckCircle2,
    className: "text-emerald-600 dark:text-emerald-400",
  },
  missed: {
    label: "Missed deadline",
    icon: XCircle,
    className: "text-destructive",
  },
  neglected: {
    label: "Neglected",
    icon: MinusCircle,
    className: "text-amber-600 dark:text-amber-400",
  },
  pending: {
    label: "Pending",
    icon: Circle,
    className: "text-muted-foreground",
  },
};

const RANGES = [30, 60, 90] as const;
const WEEKDAY_ROWS = [0, 1, 2, 3, 4, 5, 6];

// Africa/Lagos has no DST, so offsetting now by whole days stays aligned.
function lagosKey(ms: number) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
}

function lagosTime(ms: number) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(ms));
}

// Completion fraction buckets. Level 5 is reserved for a perfect day, so full
// brightness means "everything done", not just "the best day so far".
const LEVEL_CLASSES = [
  "",
  "bg-primary/15",
  "bg-primary/35",
  "bg-primary/60",
  "bg-primary/85",
  "bg-primary",
] as const;

function doneCount(day: LogDay) {
  return day.items.filter((item) => item.status === "done").length;
}

function completionLevel(day: LogDay): number {
  const total = day.items.length;
  if (total === 0) return 0;
  const done = doneCount(day);
  if (done === 0) return 1;
  const pct = done / total;
  if (pct < 0.5) return 2;
  if (pct < 0.9) return 3;
  if (pct < 1) return 4;
  return 5;
}

type HeatmapProps = {
  days: LogDay[];
  todayKey: string;
  onSelect: (date: string) => void;
};

function KpiHeatmap({ days, todayKey, onSelect }: HeatmapProps) {
  const daysAsc = [...days].reverse();

  // Pad the front so the first day lands on its true weekday row, and the
  // back so the last week column is complete.
  const leadingBlanks = parseISO(daysAsc[0].date).getDay();
  const cells: Array<LogDay | null> = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push(null);
  for (const day of daysAsc) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: Array<Array<LogDay | null>> = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  // Label a column when its Sunday opens a new month (same rule as the
  // temperature heatmap — avoids two labels fighting inside one column).
  const monthLabels: Array<{ month: string; column: number }> = [];
  let lastMonth = "";
  for (const [column, week] of weeks.entries()) {
    const sunday = week[0];
    if (sunday === null) continue;
    const month = format(parseISO(sunday.date), "MMM");
    if (month !== lastMonth) {
      monthLabels.push({ month, column });
      lastMonth = month;
    }
  }

  const rowLabel = (row: number) => {
    if (row === 1) return "Mon";
    if (row === 3) return "Wed";
    if (row === 5) return "Fri";
    return "";
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto">
        <table className="border-separate" style={{ borderSpacing: "4px" }}>
          <thead>
            <tr>
              <th className="w-8" />
              {weeks.map((week, column) => {
                const label = monthLabels.find(
                  (entry) => entry.column === column,
                );
                return (
                  <th
                    key={week[0]?.date ?? `pad-${column}`}
                    className="relative h-5 text-left font-normal text-xs text-muted-foreground/50"
                  >
                    <span className="absolute top-0">{label?.month ?? ""}</span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {WEEKDAY_ROWS.map((row) => (
              <tr key={row}>
                <th className="pr-1 text-left font-normal text-xs text-muted-foreground/50">
                  {rowLabel(row)}
                </th>
                {weeks.map((week, column) => {
                  const day = week[row];
                  return (
                    <td key={day?.date ?? `pad-${column}`} className="p-0">
                      {day ? (
                        <HeatmapCell
                          day={day}
                          isToday={day.date === todayKey}
                          onSelect={onSelect}
                        />
                      ) : (
                        <span className="block size-5" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end gap-2 text-muted-foreground text-xs">
        <span>0%</span>
        <div className="flex gap-0.5">
          {LEVEL_CLASSES.slice(1).map((className) => (
            <div
              key={className}
              className={cn("size-3 rounded-[2px]", className)}
            />
          ))}
        </div>
        <span>100%</span>
        <span className="ml-2">Nothing due</span>
        <div
          className="size-3 rounded-[2px] border border-border"
          style={{ background: "var(--background-lv1)" }}
        />
      </div>
    </div>
  );
}

type HeatmapCellProps = {
  day: LogDay;
  isToday: boolean;
  onSelect: (date: string) => void;
};

function HeatmapCell({ day, isToday, onSelect }: HeatmapCellProps) {
  const total = day.items.length;
  const done = doneCount(day);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const missed = day.items.some((item) => item.status === "missed");
  const tooltip = `${format(parseISO(day.date), "MMM d")}${isToday ? " (so far)" : ""} · ${done}/${total} done (${pct}%) · ${day.earned}/${day.available} pts`;
  const level = completionLevel(day);

  return (
    <button
      type="button"
      onClick={() => onSelect(day.date)}
      title={tooltip}
      aria-label={tooltip}
      className={cn(
        "size-5 rounded-sm border border-transparent transition-opacity hover:opacity-80",
        missed && "border-b-2 border-b-destructive",
        level === 0 ? "border-border/60" : LEVEL_CLASSES[level],
      )}
      style={level === 0 ? { background: "var(--background-lv1)" } : undefined}
    />
  );
}

type ItemRowProps = { item: LogItem };

function ItemRow({ item }: ItemRowProps) {
  const meta = STATUS_META[item.status];
  const Icon = meta.icon;
  const source =
    item.kind === "instance" ? "Instance" : (item.cadence ?? "preset");

  return (
    <div className="flex items-center gap-4 rounded-md px-2 py-2 text-sm">
      <Icon className={cn("h-4 w-4 shrink-0", meta.className)} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{item.title}</span>
        <span className="block text-muted-foreground">
          {meta.label} · <span className="capitalize">{source}</span>
          {item.completedAt !== null && ` · ${lagosTime(item.completedAt)}`}
        </span>
      </span>
      <Badge variant={item.status === "done" ? "default" : "secondary"}>
        {item.points} pts
      </Badge>
    </div>
  );
}

type DayItemsProps = { day: LogDay };

function DayItems({ day }: DayItemsProps) {
  if (day.items.length === 0) {
    return (
      <p className="px-2 py-1 text-muted-foreground text-sm">
        No checklist activity recorded this day.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-0.5 -mx-4 -mt-2">
      {day.items.map((item) => (
        <ItemRow
          key={`${item.kind}-${item.title}-${item.completedAt ?? "open"}`}
          item={item}
        />
      ))}
    </div>
  );
}

type DayBlockProps = { day: LogDay };

function DayBlock({ day }: DayBlockProps) {
  return (
    <Card>
      <CardHeader className="flex-row justify-between pb-0">
        <CardTitle className="text-base">
          {format(parseISO(day.date), "EEE, MMM d")}
        </CardTitle>
        <CardDescription className="font-mono tabular-nums">
          {day.earned} / {day.available} pts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DayItems day={day} />
      </CardContent>
    </Card>
  );
}

type StaffLogProps = { userId: string };

function StaffLog({ userId }: StaffLogProps) {
  const [asOf] = useState(() => Date.now());
  const [range, setRange] = useState<(typeof RANGES)[number]>(30);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const to = lagosKey(asOf);
  const from = lagosKey(asOf - (range - 1) * 86400000);

  const log = useQuery(api.kpis.staffLog, { userId, from, to });
  const profile = useQuery(api.myFunctions.getUserById, { userId });
  const name = profile
    ? `${profile.firstName} ${profile.lastName}`.trim()
    : userId.slice(0, 8);

  if (log === undefined) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const totalEarned = log.days.reduce((sum, day) => sum + day.earned, 0);
  // staffLog returns days newest-first, so today is first.
  const todayKey = log.days[0]?.date ?? "";
  // find with a null/undefined date never matches, so this is null then too.
  const selectedDay = log.days.find((day) => day.date === selectedDate) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <Button asChild variant="ghost" size="sm" className="self-start">
          <Link href="/admin/kpis">
            <ArrowLeft aria-hidden /> Back to KPIs
          </Link>
        </Button>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="font-bold text-2xl">{name}</h1>
            <p className="mt-1 text-muted-foreground text-sm">
              {totalEarned} pts earned · last {range} days
            </p>
          </div>
          <fieldset className="flex gap-2">
            <legend className="sr-only">Range</legend>
            {RANGES.map((days) => (
              <Button
                key={days}
                size="sm"
                variant={range === days ? "default" : "outline"}
                onClick={() => setRange(days)}
              >
                {days}d
              </Button>
            ))}
          </fieldset>
        </div>
      </header>

      <section aria-label="Completion heatmap">
        <h2 className="mb-2 font-semibold text-sm">Daily completion</h2>
        <KpiHeatmap
          days={log.days}
          todayKey={todayKey}
          onSelect={setSelectedDate}
        />
      </section>

      <section aria-label="Recent days" className="flex flex-col gap-3">
        <h2 className="font-semibold text-sm">Recent days</h2>
        <p className="text-muted-foreground text-xs">
          Item lists are rebuilt from today&apos;s checklist, so items edited
          recently may not match what was live on older days.
        </p>
        {log.days.slice(0, 5).map((day) => (
          <DayBlock key={day.date} day={day} />
        ))}
      </section>

      <Sheet
        open={selectedDay !== null}
        onOpenChange={(open) => !open && setSelectedDate(null)}
      >
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>
              {selectedDay && format(parseISO(selectedDay.date), "EEE, MMM d")}
            </SheetTitle>
            <SheetDescription>
              {selectedDay &&
                `${selectedDay.earned} / ${selectedDay.available} pts`}
            </SheetDescription>
          </SheetHeader>
          {selectedDay && (
            <div className="flex flex-col gap-0.5 overflow-y-auto px-4 pb-4">
              <DayItems day={selectedDay} />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function StaffKpiLogPage() {
  const params = useParams();
  const staffId = typeof params.staffId === "string" ? params.staffId : "";

  if (!staffId) {
    return (
      <p className="p-6 text-muted-foreground text-sm">No staff selected.</p>
    );
  }

  return (
    <div className="w-full p-6 md:p-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <StaffLog userId={staffId} />
      </div>
    </div>
  );
}
