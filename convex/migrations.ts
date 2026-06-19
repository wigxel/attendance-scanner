import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

export const migrateOccupationNamesToIds = internalMutation({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query("profile").collect();
    const occupations = await ctx.db.query("occupations").collect();
    const nameToId = new Map(occupations.map((o) => [o.name, o._id]));
    const idSet = new Set(occupations.map((o) => o._id.toString()));

    let updated = 0;

    for (const profile of profiles) {
      const val = profile.occupation;
      if (!val || val === "None") continue;

      if (idSet.has(val)) continue;

      const id = nameToId.get(val);
      if (id) {
        await ctx.db.patch(profile._id, { occupation: id });
      } else {
        await ctx.db.patch(profile._id, { occupation: "None" });
      }
      updated++;
    }

    return { updated };
  },
});

export const backfillNullMethods = internalMutation({
  args: {},
  handler: async (ctx) => {
    const registers = await ctx.db.query("daily_register").collect();

    let updated = 0;
    for (const record of registers) {
      if ((record as any).method == null) {
        await ctx.db.patch(record._id, { method: "qr" } as any);
        updated++;
      }
    }

    return { updated };
  },
});
