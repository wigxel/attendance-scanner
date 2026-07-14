/** biome-ignore-all lint/suspicious/noExplicitAny: Test file */
import { describe, expect, it } from "vitest";
import { resolveAuthState } from "./auth.utils";

function makeAuth(overrides: Partial<{ isLoaded: boolean; isSignedIn: boolean; user: any }> = {}) {
  return {
    isLoaded: true,
    isSignedIn: true,
    user: { id: "user_123", externalId: "user_123" },
    ...overrides,
  } as any;
}

function makeAccountMeta(profile: Record<string, unknown> | null = null) {
  return { user: {}, profile } as any;
}

describe("resolveAuthState", () => {
  describe("authState", () => {
    it("returns logged_out when auth is not loaded", () => {
      const result = resolveAuthState({
        auth: makeAuth({ isLoaded: false }),
        accountMeta: makeAccountMeta({ id: "user_123", occupation: "None" }),
      });

      expect(result?.authState).toBe("logged_out");
    });

    it("returns logged_out when not signed in", () => {
      const result = resolveAuthState({
        auth: makeAuth({ isSignedIn: false }),
        accountMeta: makeAccountMeta({ id: "user_123", occupation: "None" }),
      });

      expect(result?.authState).toBe("logged_out");
    });

    it("returns logged_out when user is null", () => {
      const result = resolveAuthState({
        auth: makeAuth({ user: null }),
        accountMeta: makeAccountMeta({ id: "user_123", occupation: "None" }),
      });

      expect(result?.authState).toBe("logged_out");
    });

    it("returns logged_in when signed in with non-null user", () => {
      const result = resolveAuthState({
        auth: makeAuth(),
        accountMeta: makeAccountMeta({ id: "user_123", occupation: "None" }),
      });

      expect(result?.authState).toBe("logged_in");
    });
  });

  describe("onboarding", () => {
    it("returns completed when occupation is None", () => {
      const result = resolveAuthState({
        auth: makeAuth(),
        accountMeta: makeAccountMeta({ id: "user_123", occupation: "None" }),
      });

      expect(result?.onboarding).toBe("completed");
    });

    it("returns pending when occupation is not None", () => {
      const result = resolveAuthState({
        auth: makeAuth(),
        accountMeta: makeAccountMeta({ id: "user_123", occupation: "Engineer" }),
      });

      expect(result?.onboarding).toBe("pending");
    });

    it("returns pending when occupation is missing", () => {
      const result = resolveAuthState({
        auth: makeAuth(),
        accountMeta: makeAccountMeta({ id: "user_123" }),
      });

      expect(result?.onboarding).toBe("pending");
    });

    it("returns pending when occupation is null", () => {
      const result = resolveAuthState({
        auth: makeAuth(),
        accountMeta: makeAccountMeta({ id: "user_123", occupation: null }),
      });

      expect(result?.onboarding).toBe("pending");
    });
  });

  describe("synced", () => {
    it("returns syncing when accountMeta is null", () => {
      const result = resolveAuthState({
        auth: makeAuth(),
        accountMeta: null,
      });

      expect(result?.syncState).toBe("syncing");
    });

    it("returns syncing when profile is null", () => {
      const result = resolveAuthState({
        auth: makeAuth(),
        accountMeta: makeAccountMeta(null),
      });

      expect(result?.syncState).toBe("syncing");
    });

    it("returns syncing when profile id starts with user_", () => {
      const result = resolveAuthState({
        auth: makeAuth(),
        accountMeta: makeAccountMeta({ id: "user_123", occupation: "None" }),
      });

      expect(result?.syncState).toBe("syncing");
    });

    it("returns unsynced when profile id does not start with user_", () => {
      const result = resolveAuthState({
        auth: makeAuth(),
        accountMeta: makeAccountMeta({ id: "abc_123", occupation: "None" }),
      });

      expect(result?.syncState).toBe("synced");
    });
  });

  describe("combined states", () => {
    it("returns full state for logged_in + completed onboarding + syncing", () => {
      const result = resolveAuthState({
        auth: makeAuth(),
        accountMeta: makeAccountMeta({ id: "user_123", occupation: "None" }),
      });

      expect(result).toEqual({
        authState: "logged_in",
        onboarding: "completed",
        syncState: "syncing",
      });
    });

    it("returns full state for logged_out + pending onboarding + unsynced", () => {
      const result = resolveAuthState({
        auth: makeAuth({ isSignedIn: false }),
        accountMeta: makeAccountMeta({ id: "abc_123" }),
      });

      expect(result).toEqual(expect.objectContaining({
        authState: "logged_out",
        onboarding: "pending",
      }));
    });

    it("returns null-like when auth not loaded", () => {
      const result = resolveAuthState({
        auth: makeAuth({ isLoaded: false }),
        accountMeta: makeAccountMeta({ id: "user_123" }),
      });

      expect(result).not.toBeNull();
      expect(result?.authState).toBe("logged_out");
    });
  });
});
