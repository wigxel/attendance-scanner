/**
 * Plan features that code reads. A catalogue row may carry any other name, but
 * these keys are behaviour and must not be renamed or retired in the data:
 * `convex/planFeatures.ts` refuses those writes.
 *
 * Add a key here in the same PR that starts reading it from code.
 */
export const RESERVABLE_FEATURE = "booking";

export function isReservable(features: readonly string[]): boolean {
  return features.includes(RESERVABLE_FEATURE);
}

/**
 * Keep the stored plan key when it is still reservable, otherwise fall back to
 * the first reservable plan so the flow works without opening the dropdown.
 */
export function resolvePlanKey(
  storedKey: string | null,
  reservablePlans: readonly { key: string }[],
): string | null {
  if (storedKey && reservablePlans.some((plan) => plan.key === storedKey)) {
    return storedKey;
  }

  return reservablePlans[0]?.key ?? null;
}
