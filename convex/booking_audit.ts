import type { Id } from "./_generated/dataModel";

export const subscriberUpdateAudit = (params: {
  actorId: string;
  targetId: Id<"daily_register">;
  userId: string;
  bookingId: Id<"bookings">;
  ticketId: Id<"tickets">;
}) => ({
  action: "register.subscriber-updated" as const,
  actorId: params.actorId,
  targetId: params.targetId,
  targetType: "daily_register" as const,
  metadata: JSON.stringify({
    userId: params.userId,
    bookingId: params.bookingId,
    ticketId: params.ticketId,
  }),
});
