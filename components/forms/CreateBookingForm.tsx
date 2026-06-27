"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "convex/react";
import { format, subWeeks } from "date-fns";
import { ArrowRight, Loader2 } from "lucide-react";
import React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { SeatBadge } from "@/app/reserve/components/seats";
import { DynamicSeatLayout } from "@/components/DynamicSeatLayout";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { Seat } from "@/hooks/useSeats";
import { safeArray } from "@/lib/data.helpers";
import { calculateEndDate, formatDateToLocalISO } from "@/lib/utils";
import { AccessPlanDropdown } from "./AccessPlanDropdown";
import { CustomerCombobox } from "./CustomerCombobox";

const createBookingSchema = z.object({
  customerId: z.string().min(1, { message: "Customer is required" }),
  planKey: z.string().min(1, { message: "Plan is required" }),
  startDate: z.string().min(1, { message: "Start date is required" }),
});

type CreateBookingFormValues = z.infer<typeof createBookingSchema>;

const defaultState: CreateBookingFormValues = {
  customerId: "",
  planKey: "",
  startDate: format(new Date(), "yyyy-MM-dd"),
};

interface CreateBookingFormProps {
  preselectedUserId?: string | null;
  isLoading?: boolean;
  onSubmit: (values: {
    userId: string;
    planKey: string;
    startDate: string;
    seatId: Id<"seats">;
  }) => Promise<void>;
  onCancel?: () => void;
}

export function CreateBookingForm({
  preselectedUserId,
  isLoading = false,
  onSubmit,
  onCancel,
}: CreateBookingFormProps) {
  const [selectedSeat, setSelectedSeat] = React.useState<Seat | null>(null);

  const accessPlans = useQuery(api.myFunctions.listAccessPlans);

  const form = useForm<CreateBookingFormValues>({
    resolver: zodResolver(createBookingSchema),
    defaultValues: {
      ...defaultState,
      customerId: preselectedUserId ?? "",
    },
  });

  const watchedPlanKey = form.watch("planKey");
  const watchedStartDate = form.watch("startDate");
  const watchedCustomerId = form.watch("customerId");

  const selectedPlan = React.useMemo(
    () => safeArray(accessPlans).find((p) => p.key === watchedPlanKey),
    [accessPlans, watchedPlanKey],
  );

  const endDate = React.useMemo(() => {
    if (!selectedPlan || !watchedStartDate) return null;
    const start = new Date(watchedStartDate);
    const end = calculateEndDate(start, selectedPlan.no_of_days);
    return formatDateToLocalISO(end);
  }, [selectedPlan, watchedStartDate]);

  const seats = useQuery(
    api.seats.getAllSeatsForDateRange,
    watchedStartDate && endDate
      ? { startDate: watchedStartDate, endDate }
      : "skip",
  );

  const seatOptions = React.useMemo(() => {
    if (!seats) return [];
    return seats.map((s) => ({
      _id: s._id,
      seatNumber: s.seatNumber,
      isBooked: s.isBooked,
    }));
  }, [seats]);

  const showSeatGrid = !!watchedPlanKey && !!watchedStartDate && !!endDate;
  const MIN_DATE = React.useMemo(
    () => format(subWeeks(new Date(), 2), "yyyy-MM-dd"),
    [],
  );

  const handleSeatClick = React.useCallback((seat: Seat) => {
    setSelectedSeat((prev) => (prev?._id === seat._id ? null : seat));
  }, []);

  const handleSubmit = async (values: CreateBookingFormValues) => {
    if (!selectedSeat) {
      toast.error("Please select a seat");
      return;
    }
    await onSubmit({
      userId: values.customerId,
      planKey: values.planKey,
      startDate: values.startDate,
      seatId: selectedSeat._id,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="customerId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Customer</FormLabel>
              <CustomerCombobox
                value={field.value}
                onChange={(v) => {
                  field.onChange(v);
                  setSelectedSeat(null);
                }}
                disabled={isLoading}
                readOnly={!!preselectedUserId && watchedCustomerId !== ""}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="planKey"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Select Plan</FormLabel>
                <Select
                  onValueChange={(v) => {
                    field.onChange(v);
                    setSelectedSeat(null);
                  }}
                  value={field.value}
                  disabled={isLoading}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a plan" />
                    </SelectTrigger>
                  </FormControl>
                  <AccessPlanDropdown />
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Date</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                    disabled={isLoading}
                    min={MIN_DATE}
                    onChange={(e) => {
                      field.onChange(e);
                      setSelectedSeat(null);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {showSeatGrid && (
          <div className="space-y-4 border-t pt-6">
            <h2 className="text-lg font-semibold mb-1">Select Seat</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Choose an available seat for {selectedPlan?.name ?? ""} starting{" "}
              <span className="text-foreground">
                {format(new Date(watchedStartDate), "d MMM")}
              </span>
              {endDate ? (
                <>
                  <span>
                    &nbsp;
                    <ArrowRight size="1em" className="inline" />
                    &nbsp;
                  </span>
                  <span className="text-foreground">
                    {format(new Date(endDate), "d MMM, yyyy")}
                  </span>
                </>
              ) : (
                ""
              )}
            </p>

            {!seats ? (
              <div className="h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="p-3 mb-3 -mx-4 bg-(--background-lv1) min-h-[400px] rounded-lg">
                <DynamicSeatLayout
                  seats={seatOptions}
                  selectedSeatNumbers={
                    selectedSeat ? [String(selectedSeat.seatNumber)] : []
                  }
                  onSeatClick={handleSeatClick}
                />

                <div className="flex flex-col bg-(--background) border p-4 rounded-lg mt-4">
                  <div>
                    <p className="text-foreground text-sm">Selected Seat:</p>
                    <div className="text-sm text-gray-600 mt-1">
                      <p className="font-semibold inline-flex text-foreground gap-2">
                        {selectedSeat && (
                          <SeatBadge>
                            {String(selectedSeat.seatNumber)}
                          </SeatBadge>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex border-t mt-4 pt-4 justify-between">
                    <p className="text-sm mt-1 text-muted-foreground">
                      {selectedSeat ? "1 seat selected" : "No seat selected"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Reservation"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
