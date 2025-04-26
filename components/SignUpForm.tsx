
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "./ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "./ui/form";

interface SignUpFormProps {
  onError: (error: string | null) => void;
  onToggleFlow: () => void;
}

// Zod schema for form validation
const signUpSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(8, {
    message: "Password must be at least 8 characters.",
  }),
});

type SignUpFormValues = z.infer<typeof signUpSchema>;

export default function SignUpForm({ onError, onToggleFlow }: SignUpFormProps) {
  const { signIn } = useAuthActions();
  const router = useRouter();

  // Define form with zod resolver
  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Handle form submission
  const onSubmit = async (values: SignUpFormValues) => {
    const formData = new FormData();
    formData.set("flow", "signUp");

    // Add all form values to formData
    for (const [key, value] of Object.entries(values)) {
      formData.set(key, value);
    }

    try {
      await signIn("password", formData);
      toast.success("Account created successfully");
      router.push("/onboarding");
    } catch (error) {
      const errorMessage = (error as Error).message;
      toast.error(`Sign up failed: ${errorMessage}`);
      onError(errorMessage);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 w-full">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input type="email" placeholder="Email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input type="password" placeholder="Password" {...field} />
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
          Sign up
        </button>

        <div className="flex flex-row gap-2 justify-center">
          <span>Already have an account?</span>
          <button
            type="button"
            className="text-foreground appearance-none underline hover:no-underline cursor-pointer"
            onClick={onToggleFlow}
          >
            Sign in instead
          </button>
        </div>
      </form>
    </Form>
  );
}
