"use client";
import { useUser } from "@clerk/nextjs";
import { useMutation as useTansackMutation } from "@tanstack/react-query";
import { useAction, useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import React from "react";
import { toast } from "sonner";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { AppLoader } from "@/components/loader";
import { Button } from "@/components/ui/button";
import { isDevelopment } from "@/config/constants";
import { api } from "@/convex/_generated/api";
import { safeStr } from "@/lib/data.helpers";
import { getErrorMessage } from "@/lib/error.helpers";

function ValidateConvexProfile() {
  const router = useRouter();
  const user = useUser();
  const profile_info = useQuery(api.myFunctions.getAccountMeta);
  const createAccount = useMutation(api.myFunctions.createUser);
  const updateConvexExternalId = useAction(
    api.myFunctions.setAccountExternalId,
  );

  const createAccountMutation = useTansackMutation({
    mutationFn: async ({
      clerkUser,
    }: {
      clerkUser: typeof user;
      profile: typeof profile_info;
    }) => {
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

  const redirect = React.useCallback(
    (authUser: typeof profile_info) => {
      const is_profile_complete = authUser?.user && authUser?.profile;
      if (!is_profile_complete) return;

      router.push("/account");
    },
    [router],
  );

  React.useEffect(() => {
    if (!user) return;
    if (!profile_info) return;

    if (isDevelopment) {
      console.log({ profile_info, user });
    }

    // is fully synced with convex
    if (profile_info.user && profile_info.profile) {
      redirect(profile_info);
      return;
    }

    // link convex and clerk accounts
    createAccountMutation.mutate({ clerkUser: user, profile: profile_info });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile_info, user, redirect]);

  if (createAccountMutation.isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 h-full">
        <p className="text-sm text-muted-foreground">
          Failed to create account. Please try again.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            createAccountMutation.mutate({
              clerkUser: user,
              profile: profile_info,
            })
          }
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
