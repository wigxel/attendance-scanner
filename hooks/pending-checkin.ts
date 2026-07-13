import { useCallback, useEffect, useRef } from "react";

const PENDING_CHECKIN_KEY = "inspace_pending_checkin";
const PENDING_CHECKIN_TTL_MS = 10 * 60 * 1000; // 10 minutes

export interface PendingCheckIn {
  adminId: string;
  savedAt: number;
}

/**
 * Save a pending check-in to localStorage.
 * Used when an unauthenticated user scans a QR code — the check-in is deferred
 * until after sign-up/sign-in.
 */
export function savePendingCheckIn(adminId: string): void {
  const data: PendingCheckIn = { adminId, savedAt: Date.now() };
  try {
    localStorage.setItem(PENDING_CHECKIN_KEY, JSON.stringify(data));
  } catch {
    // localStorage unavailable (SSR, private browsing quota, etc.)
  }
}

/**
 * Read and validate a pending check-in from localStorage.
 * Returns null if none exists or if it has expired (>5 min).
 */
export function getPendingCheckIn(): PendingCheckIn | null {
  try {
    const raw = localStorage.getItem(PENDING_CHECKIN_KEY);
    if (!raw) return null;

    const data: PendingCheckIn = JSON.parse(raw);
    const elapsed = Date.now() - data.savedAt;

    if (elapsed > PENDING_CHECKIN_TTL_MS) {
      clearPendingCheckIn();
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

/**
 * Clear the pending check-in from localStorage.
 */
export function clearPendingCheckIn(): void {
  try {
    localStorage.removeItem(PENDING_CHECKIN_KEY);
  } catch {
    // localStorage unavailable
  }
}

/**
 * Hook that processes a pending check-in after the user is authenticated.
 * Runs once after mount if a valid pending check-in exists and the user is signed in.
 *
 * @param isSignedIn Whether the user is currently signed in
 * @param selfCheckIn The mutation function to perform check-in
 * @param onSuccess Callback after successful check-in
 * @param onError Callback if check-in fails
 */
export function usePendingCheckIn({
  isSignedIn,
  selfCheckIn,
  onSuccess,
  onError,
}: {
  isSignedIn: boolean;
  selfCheckIn: (args: {
    method: "qr" | "one-tap";
    adminId?: string;
  }) => Promise<unknown>;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}) {
  const triggered = useRef(false);

  const processPending = useCallback(async () => {
    if (!isSignedIn || triggered.current) return;

    const pending = getPendingCheckIn();
    if (!pending) return;

    triggered.current = true;
    clearPendingCheckIn();

    try {
      await selfCheckIn({ method: "qr", adminId: pending.adminId });
      onSuccess?.();
    } catch (err) {
      onError?.(err);
    }
  }, [isSignedIn, selfCheckIn, onSuccess, onError]);

  useEffect(() => {
    processPending();
  }, [processPending]);
}
