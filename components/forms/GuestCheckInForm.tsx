"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "convex/react";
import { AlertCircleIcon } from "lucide-react";
import type * as React from "react";
import { type Control, useForm } from "react-hook-form";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/convex/_generated/api";
import { safeArray } from "@/lib/data.helpers";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { CustomerCombobox } from "./CustomerCombobox";

type GuestCheckInMode = "existing" | "new";

const guestCheckInSchema = z
  .object({
    mode: z.enum(["existing", "new"]),
    guestUserId: z.string().optional(),
    hostUserId: z
      .string()
      .min(1, { message: "Select the customer being visited" }),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    guestType: z.enum(["visitor", "student", "event_attendee"]),
  })
  .superRefine((values, ctx) => {
    const addIssue = (path: string, message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });

    // Only validate the fields of the active mode.
    if (values.mode === "existing") {
      if (!values.guestUserId) {
        addIssue("guestUserId", "Select the guest");
      } else if (values.guestUserId === values.hostUserId) {
        addIssue("guestUserId", "A customer cannot be their own guest.");
      }
      return;
    }

    if (!values.firstName) addIssue("firstName", "First name is required");
    if (!values.lastName) addIssue("lastName", "Surname is required");
    if (!values.email) {
      addIssue("email", "A valid email address is required");
    } else if (!z.string().email().safeParse(values.email).success) {
      addIssue("email", "A valid email address is required");
    }
    if (!values.phone) addIssue("phone", "Phone number is required");
  });

export type GuestCheckInFormValues = z.infer<typeof guestCheckInSchema>;

const defaultGuestCheckInState: GuestCheckInFormValues = {
  mode: "existing",
  guestUserId: "",
  hostUserId: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  guestType: "visitor",
};

interface GuestCheckInFormProps {
  initialFormData?: Partial<GuestCheckInFormValues>;
  isLoading?: boolean;
  onSubmit: (values: GuestCheckInFormValues) => Promise<void>;
  onCancel?: () => void;
  ref?: React.Ref<HTMLFormElement>;
}

type HostFieldProps = {
  control: Control<GuestCheckInFormValues>;
  isLoading: boolean;
};

function HostField({ control, isLoading }: HostFieldProps) {
  const hosts = useQuery(api.register.listTodaysHosts);
  const hostOptions = safeArray(hosts);
  const noHostsToday = hosts !== undefined && hostOptions.length === 0;

  return (
    <FormField
      control={control}
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
            <Alert variant={"destructive"}>
              <AlertCircleIcon />
              <AlertTitle>At least one visitor need</AlertTitle>
              <AlertDescription>
                A guest can only be attached to a customer who is already in
                today&apos;s scan.
              </AlertDescription>
            </Alert>
          ) : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function GuestTypeField({
  control,
  isLoading,
}: {
  control: Control<GuestCheckInFormValues>;
  isLoading: boolean;
}) {
  return (
    <FormField
      control={control}
      name="guestType"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Guest type</FormLabel>
          <Select
            onValueChange={field.onChange}
            value={field.value}
            disabled={isLoading}
          >
            <FormControl>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="visitor">Visitor</SelectItem>
              <SelectItem value="student">Student</SelectItem>
              <SelectItem value="event_attendee">Event attendee</SelectItem>
            </SelectContent>
          </Select>
          <FormDescription>
            Trainings and events are tracked separately from walk-in visitors.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function GuestCheckInForm({
  initialFormData,
  isLoading = false,
  onSubmit,
  onCancel,
  ref,
}: GuestCheckInFormProps) {
  const hosts = useQuery(api.register.listTodaysHosts);
  const noHostsToday = hosts !== undefined && safeArray(hosts).length === 0;

  const form = useForm<GuestCheckInFormValues>({
    resolver: zodResolver(guestCheckInSchema),
    defaultValues: { ...defaultGuestCheckInState, ...initialFormData },
  });

  const mode = form.watch("mode");

  return (
    <Form {...form}>
      <form
        ref={ref}
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
      >
        <Tabs
          value={mode}
          onValueChange={(value) =>
            form.setValue("mode", value as GuestCheckInMode)
          }
        >
          <TabsList className="w-full">
            <TabsTrigger value="existing" className="flex-1">
              Existing customer
            </TabsTrigger>
            <TabsTrigger value="new" className="flex-1">
              New guest
            </TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="space-y-4">
            <FormField
              control={form.control}
              name="guestUserId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Guest</FormLabel>
                  <CustomerCombobox
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    disabled={isLoading}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <HostField control={form.control} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="new" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        disabled={isLoading}
                        autoFocus
                      />
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
                      <Input
                        {...field}
                        value={field.value ?? ""}
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
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      {...field}
                      value={field.value ?? ""}
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
                      value={field.value ?? ""}
                      disabled={isLoading}
                      placeholder="+234..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <HostField control={form.control} isLoading={isLoading} />
          </TabsContent>
        </Tabs>

        <GuestTypeField control={form.control} isLoading={isLoading} />

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
