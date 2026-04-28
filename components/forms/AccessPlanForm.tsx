"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const accessPlanSchema = z.object({
  key: z.string().min(1, { message: "Key is required" }),
  name: z.string().min(1, { message: "Name is required" }),
  price: z.number().min(0, { message: "Price must be a positive number" }),
  no_of_days: z.number().min(1, { message: "Duration must be at least 1 day" }),
  description: z.string().optional(),
  features: z.string().optional(),
});

type AccessPlanFormValues = z.infer<typeof accessPlanSchema>;

interface AccessPlanFormProps {
  initialFormData?: Partial<AccessPlanFormValues>;
  isLoading?: boolean;
  onSubmit: (values: AccessPlanFormValues) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
}

const defaultState: AccessPlanFormValues = {
  key: "",
  name: "",
  price: 0,
  no_of_days: 1,
  description: "",
  features: "",
};

export function AccessPlanForm({
  initialFormData,
  isLoading = false,
  onSubmit,
  onCancel,
  submitLabel = "Add Plan",
}: AccessPlanFormProps) {
  const form = useForm<AccessPlanFormValues>({
    resolver: zodResolver(accessPlanSchema),
    defaultValues: {
      ...defaultState,
      ...initialFormData,
    },
  });

  const handleSubmit = async (values: AccessPlanFormValues) => {
    await onSubmit(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="key"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Key (unique identifier)</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="e.g., free, weekly, monthly"
                  disabled={isLoading || !!initialFormData?.key}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g., Free Plan" disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price (₦)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    onChange={(e) => field.onChange(Number.parseInt(e.target.value) || 0)}
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="no_of_days"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duration (days)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    onChange={(e) => field.onChange(Number.parseInt(e.target.value) || 1)}
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
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Description of the plan"
                  rows={2}
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="features"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Features (comma-separated)</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="e.g., priority-check-in, booking"
                  disabled={isLoading}
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
            {isLoading ? `${submitLabel.replace("...", "ing")}...` : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
