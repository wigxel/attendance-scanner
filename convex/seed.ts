import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { dayKeyOf, lagosDay } from "./kpis";

// Seed tool for manually testing dynamic (priority) tasks.
// internalMutation: never called by app code; run it from the CLI
// (`npx convex run seed:seedKpiInstances '{"dryRun":false}'`), which targets
// the deployment your CLI points at. Idempotent per day: skips when the
// target date already has instances.

export const seedKpiInstances = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const date = dayKeyOf(lagosDay(Date.now()));
    const existing = await ctx.db
      .query("kpiInstances")
      .withIndex("by_date", (q) => q.eq("date", date))
      .collect();
    if (existing.length > 0) {
      return {
        message: `Already have ${existing.length} instance(s) for ${date}.`,
      };
    }
    const tasks = [
      { title: "Reset the front-door scanner", customerId: "test-cust-1", points: 3 },
      { title: "Stock the guest welcome packs", customerId: "test-cust-2", points: 2 },
    ];
    if (args.dryRun ?? true) {
      return {
        message: `Dry run: would seed ${tasks.length} dynamic tasks for ${date}. Pass dryRun: false to insert.`,
        tasks,
      };
    }
    const ids = [];
    for (const t of tasks) {
      ids.push(
        await ctx.db.insert("kpiInstances", { ...t, date, createdAt: Date.now() }),
      );
    }
    return { message: `Seeded ${ids.length} dynamic tasks for ${date}.`, ids };
  },
});
