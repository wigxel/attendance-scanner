"use client";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "./ui/input";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  FormLabel,
} from "./ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import React from "react";
import { useReadProfile } from "@/hooks/auth";

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
    .regex(/^\+234\d+$/, {
      message: "Please enter a valid Nigerian phone number",
    }),
  occupation: z.string({
    required_error: "Please select an occupation",
  }),
});

type OnboardingFormValues = z.infer<typeof onboardingSchema>;

function OnboardingForm({ initial }: { initial: Partial<OnboardingFormValues> }) {
  const router = useRouter();
  const updateUser = useMutation(api.myFunctions.updateUser);

  //Fetch occupations from the database
  const occupations = useQuery(api.myFunctions.listOccupations) ?? [];

  // Define form with zod resolver
  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: React.useMemo(() => ({
      firstName: "",
      lastName: "",
      phoneNumber: "+234",
      occupation: "",
      ...initial
    }), [initial])
  });

  // Handle form submission
  const onSubmit = async (values: OnboardingFormValues) => {
    try {
      await updateUser({
        firstName: values.firstName,
        lastName: values.lastName,
        phoneNumber: values.phoneNumber,
        occupation: values.occupation,
      });
      toast.success("Profile created successfully");
      router.push("/");
    } catch (error) {
      const errorMessage = (error as Error).message;
      toast.error(`Profile creation failed: ${errorMessage}`);
    }
  };

  // Helper function to ensure +234 prefix and validate phone number
  const handlePhoneNumberChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    onChange: (value: string) => void,
  ) => {
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
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4 w-full"
      >
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

        <FormField
          control={form.control}
          name="occupation"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="sr-only">Occupation</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select your occupation" />
                  </SelectTrigger>
                </FormControl>

                <SelectContent>
                  {occupations.length > 0 ? (
                    occupations.map(
                      (occupation: { id: string; name: string }) => (
                        <SelectItem key={occupation.id} value={occupation.id}>
                          {occupation.name}
                        </SelectItem>
                      ),
                    )
                  ) : (
                    <SelectItem value="none" disabled>
                      No occupations available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <button
          className={cn(
            "bg-foreground text-background rounded-md p-2 h-10",
            "hover:bg-foreground/90 transition-colors",
          )}
          type="submit"
        >
          Complete Setup
        </button>
      </form>
    </Form>
  );
}

export default function OnboardingForm_(props: React.ComponentProps<typeof OnboardingForm>) {
  const router = useRouter();
  const profile = useReadProfile();

  React.useEffect(() => {
    if (!profile) return;
    if (profile?.occupation !== 'None') {
      router.push("/");
    }
  }, [profile, router]);

  return <OnboardingForm {...props} />
}
