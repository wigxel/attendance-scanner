"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "./ui/input";
import { cn } from "@/lib/utils";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "./ui/form";

// Zod schema for form validation
const onboardingSchema = z.object({
  firstName: z.string().min(2, {
    message: "First name must be at least 2 characters.",
  }),
  lastName: z.string().min(2, {
    message: "Last name must be at least 2 characters.",
  }),
  phoneNumber: z
    .string()
    .startsWith("+234", { message: "Phone number must start with +234" })
    .min(8, { message: "Phone number must be at least 8 digits" })
    .regex(/^\+234\d+$/, { message: "Please enter a valid Nigerian phone number" }),
});

type OnboardingFormValues = z.infer<typeof onboardingSchema>;

export default function OnboardingForm() {
  const router = useRouter();
  const updateUser = useMutation(api.myFunctions.updateUser);

  // Define form with zod resolver
  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phoneNumber: "+234",
    },
  });

  // Handle form submission
  const onSubmit = async (values: OnboardingFormValues) => {
    try {
      await updateUser({
        firstName: values.firstName,
        lastName: values.lastName,
        phoneNumber: values.phoneNumber,
      });
      toast.success("Profile created successfully");
      router.push("/");
    } catch (error) {
      const errorMessage = (error as Error).message;
      toast.error(`Profile creation failed: ${errorMessage}`);
    }
  };

  // Helper function to ensure +234 prefix and validate phone number
  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>, onChange: (value: string) => void) => {
    let value = e.target.value;

    // Ensure it always starts with +234
    if (!value.startsWith("+234")) {
      value = "+234" + value.replace(/^\+234/, "");
    }

    // Only allow numbers after the +234 prefix
    value = "+234" + value.substring(4).replace(/[^0-9]/g, "");

    onChange(value);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 w-full">
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input placeholder="First Name" {...field} />
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
                <FormControl>
                  <Input placeholder="Last Name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="phoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  type="tel"
                  placeholder="Phone Number"
                  {...field}
                  onChange={(e) => handlePhoneNumberChange(e, field.onChange)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <button
          className={cn(
            "bg-foreground text-background rounded-md p-2 h-10",
            "hover:bg-foreground/90 transition-colors"
          )}
          type="submit"
        >
          Complete Setup
        </button>
      </form>
    </Form>
  );
}
