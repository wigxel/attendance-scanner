import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function useReadProfile() {
  const { user, isSignedIn } = useUser();
  const router = useRouter();
  const profile = useQuery(api.myFunctions.getProfile);

  useEffect(() => {
    if (isSignedIn && user && profile === null) {
      router.replace('/onboarding')
    }
  }, [isSignedIn, user, profile, router]);

  return profile;
}

export function useCustomer({ userId }: { userId: string }) {
  const profile = useQuery(api.myFunctions.getUserById, { userId });

  return profile;
}

export function useProfile() {
  const { user, isSignedIn, isLoaded } = useUser();
  const profile = useQuery(api.myFunctions.getProfile);
  const router = useRouter();

  useEffect(() => {
    if (isSignedIn && user && profile?.occupation && profile.occupation === 'None') {
      router.push('/onboarding')
    }
  }, [isSignedIn, user, profile]);

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
