"use client";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import { safeArray } from "@/lib/data.helpers";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "convex/react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import * as z from "zod";

const manualBookingSchema = z.object({
  planKey: z.string().min(1, { message: "Plan is required" }),
  startDate: z.string().min(1, { message: "Start date is required" }),
});

type ManualBookingFormValues = z.infer<typeof manualBookingSchema>;

interface ManualBookingFormProps {
  userName: string;
  isLoading?: boolean;
  onSubmit: (values: ManualBookingFormValues) => Promise<void>;
  onCancel?: () => void;
}

export function ManualBookingForm({
  userName,
  isLoading = false,
  onSubmit,
  onCancel,
}: ManualBookingFormProps) {
  const accessPlans = useQuery(api.myFunctions.listAccessPlans);

  const form = useForm<ManualBookingFormValues>({
    resolver: zodResolver(manualBookingSchema),
    defaultValues: {
      planKey: "",
      startDate: format(new Date(), "yyyy-MM-dd"),
    },
  });

  const handleSubmit = async (values: ManualBookingFormValues) => {
    await onSubmit(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="space-y-2">
          <span className="text-sm font-medium">Customer</span>
          <Input value={userName} disabled />
        </div>

        <FormField
          control={form.control}
          name="planKey"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Select Plan</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a plan" />
                  </SelectTrigger>
                </FormControl>

                <SelectContent>
                  {safeArray(accessPlans).map((plan) => {
                    if (plan.key === 'free') return;

                    return (
                      <SelectItem key={plan.key} value={plan.key}>
                        {plan.name} - {plan.no_of_days} day(s)
                      </SelectItem>
                    );
                  })}
                </SelectContent>
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
                  min={format(new Date(), "yyyy-MM-dd")}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Creating..." : "Create Booking"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
