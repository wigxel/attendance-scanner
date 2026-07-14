import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import React, { useEffect } from "react";
import { api } from "@/convex/_generated/api";
import { type AuthState, resolveAuthState } from "./auth.utils";

/** @deprecated use useProfile hook */
export function useCustomer({ userId }: { userId: string }) {
  const profile = useQuery(api.myFunctions.getUserById, {
    userId: userId ?? "--",
  });

  return profile;
}

export function useProfile() {
  const { user, isSignedIn, isLoaded } = useUser();
  const profile = useQuery(api.myFunctions.getProfile);

  return {
    isLoading: !isLoaded || (isSignedIn && profile === undefined),
    data: profile,
    isSignedIn,
    user,
  };
}

export function useAuthId() {
  const { isSignedIn, isLoaded, user } = useUser();

  return {
    isAuthenticated: isSignedIn,
    isLoading: !isLoaded,
    id: user?.externalId,
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
