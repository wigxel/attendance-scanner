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
import { Textarea } from "@/components/ui/textarea";

const supplierFormSchema = z.object({
  name: z.string().trim().min(1, { message: "Supplier name is required" }),
  phone: z.string().trim().optional(),
  contactName: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export type SupplierFormValues = z.infer<typeof supplierFormSchema>;

export const supplierFormDefaultState: SupplierFormValues = {
  name: "",
  phone: "",
  contactName: "",
  notes: "",
};

type SupplierFormProps = {
  initialFormData?: SupplierFormValues;
  isLoading?: boolean;
  onSubmit: (values: SupplierFormValues) => Promise<void>;
  onCancel?: () => void;
};

export function SupplierForm({
  initialFormData,
  isLoading = false,
  onSubmit,
  onCancel,
}: SupplierFormProps) {
  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: initialFormData ?? supplierFormDefaultState,
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Supplier name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Mama Ngozi Wholesale" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="contactName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact person (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Ngozi" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. 0803 000 0000" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Anything worth remembering about this supplier"
                  {...field}
                />
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
              : "Save supplier"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default SupplierForm;
