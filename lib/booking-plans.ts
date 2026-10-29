type ReservablePlan = { key: string; features?: readonly string[] | null };

/**
 * Plans are reservable unless they explicitly carry the "booking" feature
 * opt-out. Plans created without features (admin-created, older seeds) must
 * stay bookable, otherwise /reserve step 1 renders an empty dropdown.
 */
export const isReservable = (plan: ReservablePlan): boolean =>
  !plan.features?.length || plan.features.includes("booking");

export const getReservablePlans = <T extends ReservablePlan>(plans: T[]): T[] =>
  plans.filter(isReservable);

/** Falls back to the first reservable plan when the stored key is stale/absent. */
export const resolvePlanKey = <T extends ReservablePlan>(
  planKey: string | null | undefined,
  plans: T[],
): string | null => {
  const match = plans.find((plan) => plan.key === planKey);

  return match?.key ?? plans[0]?.key ?? null;
};
