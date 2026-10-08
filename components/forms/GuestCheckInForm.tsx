"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "convex/react";
import type * as React from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
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
import { api } from "@/convex/_generated/api";
import { safeArray } from "@/lib/data.helpers";

const guestCheckInSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required" }),
  lastName: z.string().min(1, { message: "Surname is required" }),
  email: z.string().email({ message: "A valid email address is required" }),
  phone: z.string().min(1, { message: "Phone number is required" }),
  hostUserId: z
    .string()
    .min(1, { message: "Select the customer being visited" }),
});

export type GuestCheckInFormValues = z.infer<typeof guestCheckInSchema>;

const defaultGuestCheckInState: GuestCheckInFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  hostUserId: "",
};

interface GuestCheckInFormProps {
  initialFormData?: Partial<GuestCheckInFormValues>;
  isLoading?: boolean;
  onSubmit: (values: GuestCheckInFormValues) => Promise<void>;
  onCancel?: () => void;
  ref?: React.Ref<HTMLFormElement>;
}

export function GuestCheckInForm({
  initialFormData,
  isLoading = false,
  onSubmit,
  onCancel,
  ref,
}: GuestCheckInFormProps) {
  const hosts = useQuery(api.register.listTodaysHosts);

  const form = useForm<GuestCheckInFormValues>({
    resolver: zodResolver(guestCheckInSchema),
    defaultValues: { ...defaultGuestCheckInState, ...initialFormData },
  });

  const hostOptions = safeArray(hosts);
  const noHostsToday = hosts !== undefined && hostOptions.length === 0;

  return (
    <Form {...form}>
      <form
        ref={ref}
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
      >
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input {...field} disabled={isLoading} autoFocus />
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
                <FormLabel>Surname</FormLabel>
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
              <FormDescription>
                Used to recognise them on their next visit, and to link this
                record if they sign up later.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  {...field}
                  disabled={isLoading}
                  placeholder="+234..."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="hostUserId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Customer visiting</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={isLoading || hosts === undefined || noHostsToday}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        hosts === undefined
                          ? "Loading..."
                          : "Select the customer they are visiting"
                      }
                    />
                  </SelectTrigger>
                </FormControl>

                <SelectContent>
                  {hostOptions.map((host) => (
                    <SelectItem key={host.userId} value={host.userId}>
                      {host.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {noHostsToday ? (
                <FormDescription>
                  Nobody is checked in yet. A guest can only be attached to a
                  customer who is already in today&apos;s scan.
                </FormDescription>
              ) : null}
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          {onCancel ? (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
          ) : null}
          <Button type="submit" disabled={isLoading || noHostsToday}>
            {isLoading ? "Checking in..." : "Check in guest"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
