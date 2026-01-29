import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export function useCustomer({ userId }: { userId: string }) {
  const profile = useQuery(api.myFunctions.getUserById, { userId });

  return profile;
}

export function useProfile() {
  const { user, isSignedIn, isLoaded } = useUser();
  const profile = useQuery(api.myFunctions.getProfile);
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
    }
  }, [isSignedIn, user, profile, router, pathname]);

  return {
    isLoading: !isLoaded || (isSignedIn && profile === undefined),
    data: profile,
    isSignedIn,
    user,
  };
}

export function useAuth() {
  const { isSignedIn, isLoaded, user } = useUser();

  return {
    isAuthenticated: isSignedIn,
    isLoading: !isLoaded,
    user,
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
