import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const store = mutation({
  args: {
    temperature: v.number(),
    humidity: v.number(),
    pressure: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("roomMetrics", {
      temperature: args.temperature,
      humidity: args.humidity,
      pressure: args.pressure,
    });
  },
});
