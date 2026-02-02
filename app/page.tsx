"use client";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { api } from "@/convex/_generated/api";
import { safeStr } from "@/lib/data.helpers";
import { getErrorMessage } from "@/lib/error.helpers";
import { useUser } from "@clerk/nextjs";
import { useAction, useMutation, useQuery } from "convex/react";
import { LucideLoader } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";
import useEffectEvent from "react-use-event-hook";
import { toast } from "sonner";

function ValidateConvexProfile() {
  const user = useUser();
  const profile_info = useQuery(api.myFunctions.getAccountMeta);
  const createAccount = useMutation(api.myFunctions.createUser);
  const updateConvexExternalId = useAction(
    api.myFunctions.setAccountExternalId,
  );
  const processing = React.useRef(false);
  const router = useRouter();

  const automaticallyCreateAccount = useEffectEvent(async () => {
    if (processing.current) return;
    processing.current = true;
    const _user = user.user;

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

    processing.current = false;

    window.location.reload();
  });

  const redirect = useEffectEvent(() => {
    if (profile_info?.user && profile_info?.profile) {
      router.push("/account");
      return;
    }
  });

  React.useEffect(() => {
    redirect();
  }, [redirect]);

  React.useEffect(() => {
    if (profile_info) {
      console.log({ profile_info })
      if (profile_info.user && profile_info.profile) {
        return redirect();
      }

      automaticallyCreateAccount().catch((err) => {
        toast.error(getErrorMessage(err));
      });
    }
  }, [profile_info, redirect, automaticallyCreateAccount]);

  return (
    <div className="flex h-full items-center justify-center">
      <div className="bg-white rounded-full p-4">
        <LucideLoader
          size={"2rem"}
          strokeWidth={1}
          className="animate animate-spin"
        />
      </div>
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
