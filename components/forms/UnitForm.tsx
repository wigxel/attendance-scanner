"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
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

const unitFormSchema = z.object({
  name: z.string().trim().min(1, { message: "Unit name is required" }),
  abbreviation: z.string().trim().optional(),
});

export type UnitFormValues = z.infer<typeof unitFormSchema>;

export const unitFormDefaultState: UnitFormValues = {
  name: "",
  abbreviation: "",
};

type UnitFormProps = {
  initialFormData?: UnitFormValues;
  isLoading?: boolean;
  onSubmit: (values: UnitFormValues) => Promise<void>;
  onCancel?: () => void;
};

export function UnitForm({
  initialFormData,
  isLoading = false,
  onSubmit,
  onCancel,
}: UnitFormProps) {
  const form = useForm<UnitFormValues>({
    resolver: zodResolver(unitFormSchema),
    defaultValues: initialFormData ?? unitFormDefaultState,
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unit name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. carton" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="abbreviation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Abbreviation (optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g. ctn" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={form.formState.isSubmitting || isLoading}
          >
            {form.formState.isSubmitting || isLoading
              ? "Saving..."
              : "Save unit"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
