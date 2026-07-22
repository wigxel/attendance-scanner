import type { useUser } from "@clerk/nextjs";
import type { FunctionReference } from "convex/server";
import { isNullable } from "effect/Predicate";
import type { api } from "@/convex/_generated/api";
import { safeObj, safeStr } from "@/lib/data.helpers";

export type AuthState = {
    authState: "logged_in" | "logged_out";
    onboarding: "completed" | "pending",
    syncState: "syncing" | "synced"
};

type InferQueryOutput<Query> =
    Query extends FunctionReference<"query">
    ? Query["_returnType"] | undefined
    : never;

type AccountMeta = InferQueryOutput<typeof api.myFunctions.getAccountMeta>;

export function resolveAuthState({
    auth,
    accountMeta,
}: {
    auth: ReturnType<typeof useUser>;
    accountMeta: AccountMeta;
}): AuthState | null {
    const profile = safeObj(accountMeta?.profile);
    const isConvexId = !safeStr(profile?.id).startsWith("user_");

    const isOnboardingComplete = profile.occupation && profile.occupation !== "None";
    const isLoggedIn = auth.isLoaded
        ? auth.isSignedIn && !isNullable(auth.user)
        : false;
    const isSynced = !isNullable(accountMeta?.profile) && isConvexId;

    return {
        authState: isLoggedIn ? "logged_in" : "logged_out",
        onboarding: isOnboardingComplete ? "completed" : "pending",
        syncState: isSynced ? "synced" : "syncing"
    };
}