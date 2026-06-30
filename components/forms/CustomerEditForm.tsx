"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "convex/react";
import { useForm } from "react-hook-form";
import * as z from "zod";
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
import type { Id } from "@/convex/_generated/dataModel";
import { safeArray } from "@/lib/data.helpers";

const customerEditSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required" }),
  lastName: z.string().min(1, { message: "Last name is required" }),
  phoneNumber: z.string().optional(),
  email: z
    .string()
    .email({ message: "Invalid email address" })
    .optional()
    .or(z.literal("")),
  occupation: z.string().min(1, { message: "Occupation is required" }),
});

type CustomerEditFormValues = z.infer<typeof customerEditSchema>;

interface CustomerEditFormProps {
  initialData: {
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    email?: string;
    occupationId: Id<"occupations"> | undefined;
  };
  onSubmit: (values: CustomerEditFormValues) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function CustomerEditForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: CustomerEditFormProps) {
  const occupations = useQuery(api.myFunctions.listOccupations);

  const form = useForm<CustomerEditFormValues>({
    resolver: zodResolver(customerEditSchema),
    defaultValues: {
      firstName: initialData.firstName,
      lastName: initialData.lastName,
      phoneNumber: initialData.phoneNumber ?? "",
      email: initialData.email ?? "",
      occupation: initialData.occupationId,
    },
  });

  const handleSubmit = async (values: CustomerEditFormValues) => {
    await onSubmit(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  {...field}
                  disabled={isLoading}
                  placeholder="email@example.com"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  {...field}
                  disabled={isLoading}
                  placeholder="+1234567890"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="occupation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Occupation</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isLoading}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select an occupation" />
                  </SelectTrigger>
                </FormControl>

                <SelectContent>
                  {safeArray(occupations).map((occ) => (
                    <SelectItem key={occ.id} value={occ.id}>
                      {occ.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
