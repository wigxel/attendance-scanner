import { v } from "convex/values";
import { format } from "date-fns";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction, internalQuery } from "./_generated/server";

// Coffee-shop rule: a guest's first hour is free, then the hourly plan.
const FREE_GUEST_HOUR_MS = 60 * 60_000;

/**
 * Re-reads the guest's latest visit when the free hour expires. Paying,
 * checking out or being reclassified before then clears the alert because
 * the row no longer matches.
 */
export const overdueGuest = internalQuery({
  args: { guestUserId: v.string() },
  handler: async (ctx, { guestUserId }) => {
    const row = await ctx.db
      .query("daily_register")
      .withIndex("user", (q) => q.eq("userId", guestUserId))
      .order("desc")
      .first();

    if (
      !row ||
      !row.access.visiting ||
      row.access.kind !== "free" ||
      row.checkedout_at
    ) {
      return null;
    }

    const checkedInAt = Date.parse(row.timestamp);
    if (!Number.isFinite(checkedInAt)) return null;
    if (Date.now() - checkedInAt < FREE_GUEST_HOUR_MS) return null;

    const guest = await ctx.db.get(guestUserId as Id<"users">);

    return { name: guest?.name ?? "A guest", checkedInAt };
  },
});

/**
 * Scheduled once per guest check-in, an hour later. Fans out to staff who
 * can check people in, on push and in the inbox bell.
 */
export const checkGuestStay = internalAction({
  args: { guestUserId: v.string() },
  handler: async (ctx, { guestUserId }) => {
    const overdue = await ctx.runQuery(internal.guestAlerts.overdueGuest, {
      guestUserId,
    });
    if (!overdue) return null;

    const recipients = await ctx.runQuery(
      internal.notifications.alertRecipientKeys,
      { privilege: "attendance:checkin" },
    );

    const checkedInAt = format(new Date(overdue.checkedInAt), "h:mm a");
    const alert = {
      channels: ["push", "inapp"] as Array<"push" | "inapp">,
      title: `Guest overstayed: ${overdue.name}`,
      body: `${overdue.name} checked in at ${checkedInAt} and is still unpaid after an hour.`,
      url: "/admin/customers",
      severity: "warning" as const,
    };

    for (const recipientKey of recipients) {
      try {
        await ctx.runMutation(internal.notifications.send, {
          recipientKey,
          ...alert,
        });
      } catch (error) {
        // One bad recipient must not swallow the rest of the fan-out.
        console.error("guest overstay alert failed", recipientKey, error);
      }
    }

    return null;
  },
});
