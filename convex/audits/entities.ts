import { AuditEntry } from "../../lib/audit-entries";
import type { Id } from "../_generated/dataModel";

export function makeAudit<
  TParams extends { actorId: string; targetId: string },
>(config: {
  action: string;
  targetType: string;
  highlights?: (keyof Omit<TParams, "actorId" | "targetId">)[];
}) {
  return (params: TParams) => {
    const { targetId, actorId, ...data } = params;
    const result = {
      action: config.action,
      actorId,
      targetId,
      targetType: config.targetType,
    } as {
      action: string;
      actorId: string;
      targetId: TParams["targetId"];
      targetType: string;
      metadata?: string;
    };
    const metadataResult = AuditEntry.create(
      config.action,
      data,
      config.highlights as string[] | undefined,
    );
    if (metadataResult !== undefined) {
      (result as Record<string, unknown>).metadata =
        JSON.stringify(metadataResult);
    }
    return result;
  };
}

export const subscriberUpdateAudit = makeAudit<{
  actorId: string;
  targetId: Id<"daily_register">;
  userId: string;
  bookingId: Id<"bookings">;
  ticketId: Id<"tickets">;
}>({ action: "register.subscriber-updated", targetType: "daily_register" });

export const bookingDeletedAudit = makeAudit<{
  actorId: string;
  targetId: Id<"bookings">;
  ownerUserId: string;
  seatIds: string[];
  amount: number;
  duration: number;
  durationType: string;
  status: string;
  ticketCount: number;
}>({
  action: "booking.deleted",
  targetType: "booking",
  highlights: ["amount", "seatIds", "duration"],
});

export const occupationDeletedAudit = makeAudit<{
  actorId: string;
  targetId: Id<"occupations">;
  name: string;
}>({
  action: "occupation.deleted",
  targetType: "occupation",
  highlights: ["name"],
});

export const suggestionDeletedAudit = makeAudit<{
  actorId: string;
  targetId: Id<"featureRequest">;
  title: string;
  voteCount: number;
}>({
  action: "suggestion.deleted",
  targetType: "featureRequest",
  highlights: ["title"],
});

export const planDeletedAudit = makeAudit<{
  actorId: string;
  targetId: Id<"accessPlans">;
  key: string;
  name: string;
}>({ action: "plan.deleted", targetType: "accessPlan", highlights: ["name"] });

export const permissionDeletedAudit = makeAudit<{
  actorId: string;
  targetId: string;
}>({ action: "permission.deleted", targetType: "permission" });

export const roleDeletedAudit = makeAudit<{
  actorId: string;
  targetId: string;
}>({ action: "role.deleted", targetType: "role" });

export const identityDeletedAudit = makeAudit<{
  actorId: string;
  targetId: string;
}>({ action: "identity.deleted", targetType: "identity" });

export const profileDeletedAudit = makeAudit<{
  actorId: "system";
  targetId: Id<"profile">;
}>({ action: "profile.deleted", targetType: "profile" });

export const userDeletedAudit = makeAudit<{
  actorId: "system";
  targetId: Id<"users">;
}>({ action: "user.deleted", targetType: "users" });
