import { v } from "convex/values";
import { query } from "./_generated/server";
import { parse, format, startOfDay, endOfDay } from "date-fns";

export const getDaily = query({
  args: {
    date: v.optional(v.string()), // format: yyyy/MM/dd
  },
  handler: async (ctx, args) => {
    const targetDate = args.date
      ? parse(args.date, "yyyy/MM/dd", new Date())
      : new Date();
    
    const start = startOfDay(targetDate);
    const end = endOfDay(targetDate);
    
    // Query daily_register for the target date
    const registers = await ctx.db
      .query("daily_register")
      .filter((q) =>
        q.and(
          q.gte(q.field("timestamp"), start.toISOString()),
          q.lte(q.field("timestamp"), end.toISOString()),
        )
      )
      .collect();
    
    // Compute metrics
    const uniqueUsers = new Set<string>();
    const uniquePaidUsers = new Set<string>();
    const uniqueFreeUsers = new Set<string>();
    const subscribedUsers = new Set<string>();
    
    for (const reg of registers) {
      uniqueUsers.add(reg.userId);
      
      if (reg.access?.kind === "paid") {
        uniquePaidUsers.add(reg.userId);
      }
      
      if (reg.access?.kind === "free") {
        uniqueFreeUsers.add(reg.userId);
      }
      
      // Consider a user subscribed if they have a ticketId
      if (reg.ticketId) {
        subscribedUsers.add(reg.userId);
      }
    }
    
    return {
      dailyReport: {
        date: format(targetDate, "yyyy/MM/dd"),
        no_of_customers: uniqueUsers.size,
        no_of_paid_customers: uniquePaidUsers.size,
        no_of_free_customer: uniqueFreeUsers.size,
        subscribed_customers: subscribedUsers.size,
      },
    };
  },
});