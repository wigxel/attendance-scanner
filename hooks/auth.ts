import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect } from "react";
import { api } from "@/convex/_generated/api";
import { type AuthState, resolveAuthState } from "./auth.utils";

export function useCustomer({ userId }: { userId: string }) {
  const profile = useQuery(api.myFunctions.getUserById, {
    userId: userId ?? "--",
  });

  return profile;
}

export function useProfile() {
  const { user, isSignedIn, isLoaded } = useUser();
  const profile = useQuery(api.myFunctions.getProfile);
  const accountMeta = useQuery(api.myFunctions.getAccountMeta);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    console.assert(
      pathname !== "/onboarding",
      "Never use this hook useProfile in the onboarding screen",
    );

    if (pathname === "/onboarding") {
      return;
    }

    if (isSignedIn && user && profile?.id?.startsWith("user_")) {
      router.replace("/onboarding");
      return;
    }

    if (
      isSignedIn &&
      user &&
      profile?.occupation &&
      profile.occupation === "None"
    ) {
      router.push("/onboarding");
      return;
    }

    // New user whose webhook may or may not have fired: no profile exists yet.
    // Once accountMeta has loaded and confirmed no profile, send to onboarding.
    if (
      isSignedIn &&
      user &&
      profile === null &&
      accountMeta !== undefined &&
      accountMeta?.profile === null
    ) {
      router.push("/onboarding");
    }
  }, [isSignedIn, user, profile, accountMeta, router, pathname]);

  return {
    isLoading: !isLoaded || (isSignedIn && profile === undefined),
    data: profile,
    isSignedIn,
    user,
  };
}

export function useAuthId() {
  const accountMeta = useQuery(api.myFunctions.getAccountMeta);
  const isLoading = accountMeta === undefined;
  const id = accountMeta?.user?._id ?? undefined;

  return {
    isAuthenticated: !!id,
    isLoading,
    id,
  };
}

// Helper hook for components that require authentication
export function useRequireAuth() {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) {
    return { isLoading: true, isAuthenticated: false };
  }

  return { isLoading: false, isAuthenticated: isSignedIn };
}

export function useAuthEvents(
  params: { onChange: (event: AuthState) => void }
) {
  const clerkAuthState = useUser();
  const accountMeta = useQuery(api.myFunctions.getAccountMeta);

  const status = React.useMemo(() => {
    if (!clerkAuthState.isLoaded) return null;

    return resolveAuthState({
      auth: clerkAuthState,
      accountMeta,
    });
  }, [accountMeta, clerkAuthState]);

  useEffect(() => {
    if (!status) return;
    params.onChange(status);
  }, [status, params]);

  return status;
}