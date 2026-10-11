"use client";

import { useMutation, useQuery } from "convex/react";
import { ListChecks, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  KpiFormDialog,
  type KpiPreset,
} from "@/components/admin/dialogs/KpiFormDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { getErrorMessage } from "@/lib/error.helpers";
import { cn } from "@/lib/utils";

const CADENCE_LABEL: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function KpiPresetManagement() {
  const kpis = useQuery(api.kpis.listAll, {});
  const archiveKpi = useMutation(api.kpis.archiveKpi);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selected, setSelected] = useState<KpiPreset | null>(null);
  const [toArchive, setToArchive] = useState<KpiPreset | null>(null);
  const [archiving, setArchiving] = useState(false);

  const handleArchive = async () => {
    if (!toArchive) return;
    setArchiving(true);
    try {
      await archiveKpi({ kpiId: toArchive._id });
      toast.success("KPI archived");
      setToArchive(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setArchiving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-foreground flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-muted-foreground" />
            KPI Presets
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Preset daily, weekly and monthly KPIs with points. Managers check
            them off; archived KPIs keep their history.
          </p>
        </div>

        <Button
          onClick={() => {
            setSelected(null);
            setIsFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Create KPI
        </Button>
      </div>

      <div className="rounded-lg border bg-background shadow-sm overflow-hidden">
        {kpis === undefined ? (
          <div className="flex justify-center p-8">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
          </div>
        ) : kpis.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No KPIs yet. Create the first preset.
          </div>
        ) : (
          <ul className="divide-y">
            {kpis.map((t) => (
              <li key={t._id} className="flex items-center gap-3 p-3">
                <span className="flex-1">
                  <span
                    className={cn(
                      "block text-sm font-medium",
                      !t.isActive && "line-through text-muted-foreground",
                    )}
                  >
                    {t.title}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {CADENCE_LABEL[t.cadence] ?? t.cadence}
                    {t.cadence === "weekly" && t.dueWeekday !== undefined
                      ? ` · due ${WEEKDAYS[t.dueWeekday] ?? ""}`
                      : ""}
                    {t.cadence === "monthly" && t.dueMonthDay !== undefined
                      ? ` · due day ${t.dueMonthDay}`
                      : ""}
                    {t.windowStart || t.windowEnd
                      ? ` · ${t.windowStart ?? "00:00"}–${t.windowEnd ?? "23:59"}`
                      : ""}
                  </span>
                </span>
                <Badge variant="secondary">{t.points} pts</Badge>
                {!t.isActive && <Badge variant="outline">archived</Badge>}
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Edit ${t.title}`}
                  onClick={() => {
                    setSelected(t as KpiPreset);
                    setIsFormOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                {t.isActive && (
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Archive ${t.title}`}
                    onClick={() => setToArchive(t as KpiPreset)}
                  >
                    Archive
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <KpiFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        kpi={selected}
      />

      <AlertDialog
        open={toArchive !== null}
        onOpenChange={(open) => !open && setToArchive(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive kpi?</AlertDialogTitle>
            <AlertDialogDescription>
              {toArchive?.title} will leave the checklist but keep its history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive} disabled={archiving}>
              {archiving ? "Archiving..." : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
