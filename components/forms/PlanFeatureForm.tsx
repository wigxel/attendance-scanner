"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const planFeatureSchema = z.object({
  name: z.string().min(1, { message: "Key is required" }),
  label: z.string().min(1, { message: "Label is required" }),
  description: z.string(),
  category: z.string().min(1, { message: "Category is required" }),
  isActive: z.boolean(),
});

export type PlanFeatureFormValues = z.infer<typeof planFeatureSchema>;

interface PlanFeatureFormProps {
  initialFormData?: Partial<PlanFeatureFormValues>;
  isLoading?: boolean;
  isProtected?: boolean;
  onSubmit: (values: PlanFeatureFormValues) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
}

const defaultState: PlanFeatureFormValues = {
  name: "",
  label: "",
  description: "",
  category: "",
  isActive: true,
};

export function PlanFeatureForm({
  initialFormData,
  isLoading = false,
  isProtected = false,
  onSubmit,
  onCancel,
  submitLabel = "Add",
}: PlanFeatureFormProps) {
  const form = useForm<PlanFeatureFormValues>({
    resolver: zodResolver(planFeatureSchema),
    defaultValues: { ...defaultState, ...initialFormData },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-3 rounded-lg border p-4 bg-(--background-lv1)"
      >
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Key</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="e.g. booking"
                    disabled={isLoading || isProtected}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="e.g. Booking"
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="label"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Label</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Shown next to the checkbox"
                  disabled={isLoading}
                />
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
                <Input
                  {...field}
                  placeholder="Helper text under the checkbox"
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center gap-2 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(checked) =>
                    field.onChange(checked === true)
                  }
                  disabled={isLoading || isProtected}
                />
              </FormControl>
              <FormLabel className="font-normal">
                Offered when editing a plan
              </FormLabel>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
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
            {isLoading ? "Saving..." : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
