"use client";
import { useUser } from "@clerk/nextjs";
import { useMutation as useTansackMutation } from "@tanstack/react-query";
import { useAction, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import React from "react";
import { toast } from "sonner";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { AppLoader } from "@/components/loader";
import { Button } from "@/components/ui/button";
import { isDevelopment } from "@/config/constants";
import { api } from "@/convex/_generated/api";
import { useAuthEvents } from "@/hooks/auth";
import { safeStr } from "@/lib/data.helpers";
import { getErrorMessage } from "@/lib/error.helpers";

function ValidateConvexProfile() {
  const router = useRouter();
  const user = useUser();
  const createAccount = useMutation(api.myFunctions.createUser);
  const updateConvexExternalId = useAction(
    api.myFunctions.setAccountExternalId,
  );

  const createAccountMutation = useTansackMutation({
    mutationFn: async ({ clerkUser }: { clerkUser: typeof user }) => {
      const _user = clerkUser.user;

      if (!_user) {
        throw new Error("Invalid user");
      }

      const user_id = await createAccount({
        email: _user?.emailAddresses[0].emailAddress,
        firstName: safeStr(_user?.firstName),
        lastName: safeStr(_user?.lastName),
      });

      await updateConvexExternalId({
        clerk_user_id: _user.id,
        convex_user_id: user_id,
      });

      window.location.reload();
    },
    onError: (error) => {
      toast.error("Error setting up account.", {
        description: getErrorMessage(error),
      });
    },
  });

  const triggered = React.useRef(false);

  useAuthEvents({
    onChange: (state) => {
      if (isDevelopment) {
        console.log("auth state:", state);
      }

      if (state.authState === "logged_out") return;

      // Fully synced with Convex — navigate to account
      if (state.syncState === "synced") {
        router.push("/account");
        return;
      }

      // Not synced yet — link Clerk and Convex accounts (once)
      if (state.syncState === "syncing" && !triggered.current) {
        triggered.current = true;
        createAccountMutation.mutate({ clerkUser: user });
      }
    },
  });

  if (createAccountMutation.isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 h-full">
        <p className="text-sm text-muted-foreground">
          Failed to create account. Please try again.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            triggered.current = false;
            createAccountMutation.mutate({ clerkUser: user });
          }}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center">
      <AppLoader />
    </div>
  );
}

export default function AccountValidationPage() {
  return (
    <>
      <title>Customer Account | InSpace</title>
      <div className="fixed inset-0 z-0 scanline-container pointer-events-none" />
      <div className="z-[2] relative">
        <Header />

        <main className="px-4 min-h-[calc(100svh-var(--header-height)*2)]">
          <ValidateConvexProfile />
        </main>

        <Footer />
      </div>
    </>
  );
}
