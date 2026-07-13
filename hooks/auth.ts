import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "@/convex/_generated/api";

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
  const { isSignedIn, isLoaded, user } = useUser();
  const accountMeta = useQuery(api.myFunctions.getAccountMeta);

  // Prefer Clerk's externalId (set by webhook), but fall back to the
  // Convex user ID from getAccountMeta (email-based lookup) when
  // externalId hasn't been set yet.
  const id = user?.externalId ?? accountMeta?.user?._id ?? undefined;

  return {
    isAuthenticated: isSignedIn,
    isLoading: !isLoaded || (isSignedIn && id === undefined),
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
