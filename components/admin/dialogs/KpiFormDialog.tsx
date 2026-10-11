"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getErrorMessage } from "@/lib/error.helpers";

const kpiSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  cadence: z.enum(["daily", "weekly", "monthly"]),
  audience: z.enum(["day", "night", "all"]),
  dueWeekday: z.number().int().min(0).max(6).optional(),
  dueMonthDay: z.number().int().min(1).max(31).optional(),
  points: z.coerce.number().int().min(1, "Points must be at least 1"),
  isActive: z.boolean(),
  windowStart: z.string().optional(),
  windowEnd: z.string().optional(),
});
// Any order is valid: end <= start means an overnight window (e.g. 18:00–06:00).

type KpiFormValues = z.infer<typeof kpiSchema>;

export type KpiPreset = {
  _id: Id<"kpis">;
  title: string;
  description?: string;
  cadence: "daily" | "weekly" | "monthly";
  audience: "day" | "night" | "all";
  dueWeekday?: number;
  dueMonthDay?: number;
  points: number;
  isActive: boolean;
  windowStart?: string;
  windowEnd?: string;
};

const defaultState: KpiFormValues = {
  title: "",
  description: "",
  cadence: "daily",
  audience: "all",
  dueWeekday: undefined,
  dueMonthDay: undefined,
  points: 5,
  isActive: true,
  windowStart: "",
  windowEnd: "",
};

function toPayload(data: KpiFormValues) {
  return {
    title: data.title,
    description: data.description || undefined,
    cadence: data.cadence,
    audience: data.audience,
    dueWeekday: data.dueWeekday,
    dueMonthDay: data.dueMonthDay,
    points: data.points,
    isActive: data.isActive,
    windowStart: data.windowStart || undefined,
    windowEnd: data.windowEnd || undefined,
  };
}

type KpiFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kpi?: KpiPreset | null;
};

export function KpiFormDialog({ open, onOpenChange, kpi }: KpiFormDialogProps) {
  const createKpi = useMutation(api.kpis.createKpi);
  const updateKpi = useMutation(api.kpis.updateKpi);

  const form = useForm<KpiFormValues>({
    resolver: zodResolver(kpiSchema),
    defaultValues: defaultState,
  });
  const { register, handleSubmit, reset, setValue, watch, formState } = form;
  const isEditing = !!kpi;

  useEffect(() => {
    if (open) {
      reset(
        kpi
          ? {
              title: kpi.title,
              description: kpi.description ?? "",
              cadence: kpi.cadence,
              audience: kpi.audience,
              dueWeekday: kpi.dueWeekday,
              dueMonthDay: kpi.dueMonthDay,
              points: kpi.points,
              isActive: kpi.isActive,
              windowStart: kpi.windowStart ?? "",
              windowEnd: kpi.windowEnd ?? "",
            }
          : defaultState,
      );
    }
  }, [open, kpi, reset]);

  const onSubmit = async (data: KpiFormValues) => {
    try {
      if (isEditing && kpi) {
        await updateKpi({ kpiId: kpi._id, ...toPayload(data) });
        toast.success("KPI updated");
      } else {
        await createKpi(toPayload(data));
        toast.success("KPI created");
      }
      reset(defaultState);
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const errors = formState.errors;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Edit KPI" : "Add New KPI"}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4 px-4">
          <div>
            <label htmlFor="kpi-title" className="block text-sm font-medium">
              Title *
            </label>
            <Input id="kpi-title" {...register("title")} className="mt-1" />
            {errors.title && (
              <p className="mt-1 text-xs text-red-600">
                {errors.title.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="kpi-description"
              className="block text-sm font-medium"
            >
              Description
            </label>
            <Textarea
              id="kpi-description"
              rows={2}
              {...register("description")}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="block text-sm font-medium">Cadence *</span>
              <Select
                value={watch("cadence")}
                onValueChange={(v) => {
                  setValue("cadence", v as KpiFormValues["cadence"]);
                  setValue("dueWeekday", undefined);
                  setValue("dueMonthDay", undefined);
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <span className="block text-sm font-medium">Shift *</span>
              <Select
                value={watch("audience")}
                onValueChange={(v) =>
                  setValue("audience", v as KpiFormValues["audience"])
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="night">Night</SelectItem>
                  <SelectItem value="all">All shifts</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="kpi-points" className="block text-sm font-medium">
                Points *
              </label>
              <Input
                id="kpi-points"
                type="number"
                min={1}
                {...register("points")}
                className="mt-1"
              />
              {errors.points && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.points.message}
                </p>
              )}
            </div>
          </div>

          {watch("cadence") === "weekly" && (
            <div>
              <span className="block text-sm font-medium">Due day of week</span>
              <Select
                value={
                  watch("dueWeekday") === undefined
                    ? "any"
                    : String(watch("dueWeekday"))
                }
                onValueChange={(v) =>
                  setValue("dueWeekday", v === "any" ? undefined : Number(v))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Any day" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any day</SelectItem>
                  <SelectItem value="0">Monday</SelectItem>
                  <SelectItem value="1">Tuesday</SelectItem>
                  <SelectItem value="2">Wednesday</SelectItem>
                  <SelectItem value="3">Thursday</SelectItem>
                  <SelectItem value="4">Friday</SelectItem>
                  <SelectItem value="5">Saturday</SelectItem>
                  <SelectItem value="6">Sunday</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {watch("cadence") === "monthly" && (
            <div>
              <label
                htmlFor="kpi-due-month-day"
                className="block text-sm font-medium"
              >
                Due day of month
              </label>
              <Input
                id="kpi-due-month-day"
                type="number"
                min={1}
                max={31}
                placeholder="Any day"
                {...register("dueMonthDay", {
                  setValueAs: (v) => (v === "" ? undefined : Number(v)),
                })}
                className="mt-1"
              />
              {errors.dueMonthDay && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.dueMonthDay.message}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="kpi-window-start"
                className="block text-sm font-medium"
              >
                Window start
              </label>
              <Input
                id="kpi-window-start"
                type="time"
                {...register("windowStart")}
                className="mt-1"
              />
            </div>
            <div>
              <label
                htmlFor="kpi-window-end"
                className="block text-sm font-medium"
              >
                Window end
              </label>
              <Input
                id="kpi-window-end"
                type="time"
                {...register("windowEnd")}
                className="mt-1"
              />
              {errors.windowEnd && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.windowEnd.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-end">
            <label
              htmlFor="kpi-active"
              className="flex items-center gap-2 text-sm font-medium pb-2"
            >
              <Switch
                id="kpi-active"
                checked={watch("isActive")}
                onCheckedChange={(v) => setValue("isActive", v)}
              />
              Active
            </label>
          </div>

          <SheetFooter className="sticky flex-row *:flex-1 bottom-0 pt-4 border-t mt-6">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={formState.isSubmitting}>
              {formState.isSubmitting
                ? "Saving..."
                : isEditing
                  ? "Save Changes"
                  : "Create KPI"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
