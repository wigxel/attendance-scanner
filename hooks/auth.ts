import { api } from "@/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";

export function useReadProfile() {
  const { user, isSignedIn } = useUser();
  const profile = useQuery(api.myFunctions.getProfile);
  const autoCreateProfile = useMutation(api.auth.autoCreateProfile);

  // Auto-create profile when user signs in but doesn't have a profile
  useEffect(() => {
    if (isSignedIn && user && profile === null) {
      autoCreateProfile().catch((error) => {
        console.error("Failed to auto-create profile:", error);
      });
    }
  }, [isSignedIn, user, profile, autoCreateProfile]);

  return profile;
}

export function useProfile() {
  const { user, isSignedIn, isLoaded } = useUser();
  const profile = useQuery(api.myFunctions.getProfile);
  const autoCreateProfile = useMutation(api.auth.autoCreateProfile);

  // Auto-create profile when user signs in but doesn't have a profile
  useEffect(() => {
    if (isSignedIn && user && profile === null) {
      autoCreateProfile().catch((error) => {
        console.error("Failed to auto-create profile:", error);
      });
    }
  }, [isSignedIn, user, profile, autoCreateProfile]);

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
