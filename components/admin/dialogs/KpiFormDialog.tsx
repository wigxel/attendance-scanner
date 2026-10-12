"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
  kpi?: KpiPreset | null;
  onOpenChange: (open: boolean) => void;
};

export function KpiFormDialog({ open, onOpenChange, kpi }: KpiFormDialogProps) {
  const createKpi = useMutation(api.kpis.createKpi);
  const updateKpi = useMutation(api.kpis.updateKpi);

  const form = useForm<KpiFormValues>({
    resolver: zodResolver(kpiSchema),
    defaultValues: defaultState,
  });
  const { handleSubmit, reset, setValue, formState } = form;
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Edit KPI" : "Add New KPI"}</SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4 py-4 px-4"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="audience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shift *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="day">Day</SelectItem>
                        <SelectItem value="night">Night</SelectItem>
                        <SelectItem value="all">All shifts</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cadence"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cadence *</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(v) => {
                        field.onChange(v);
                        setValue("dueWeekday", undefined);
                        setValue("dueMonthDay", undefined);
                      }}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="points"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Points *</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch("cadence") === "weekly" && (
                <FormField
                  control={form.control}
                  name="dueWeekday"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due day of week</FormLabel>
                      <Select
                        value={
                          field.value === undefined
                            ? "any"
                            : String(field.value)
                        }
                        onValueChange={(v) =>
                          field.onChange(v === "any" ? undefined : Number(v))
                        }
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Any day" />
                          </SelectTrigger>
                        </FormControl>
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {form.watch("cadence") === "monthly" && (
                <FormField
                  control={form.control}
                  name="dueMonthDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due day of month</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={31}
                          placeholder="Any day"
                          {...field}
                          onChange={(e) => {
                            const raw = e.target.value;
                            field.onChange(
                              raw === "" ? undefined : Number(raw),
                            );
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="windowStart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Window start</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="windowEnd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Window end</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0 justify-between bg-muted/50 hover:bg-muted p-4 rounded-lg">
                  <div className="space-y-1 flex-1">
                    <FormLabel className="text-foreground text-xs">
                      Activate immediately
                    </FormLabel>
                    <FormDescription className="text-xs max-w-[40ch]">
                      Live on staff checklists the moment you save. Turn off to
                      save as a draft. Archived KPIs keep their history.
                    </FormDescription>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <SheetFooter className="sticky flex-row justify-end bottom-0 pt-4 border-t mt-6">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button size="sm" type="submit" disabled={formState.isSubmitting}>
                {formState.isSubmitting
                  ? "Saving..."
                  : isEditing
                    ? "Save Changes"
                    : "Create KPI"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
