import { v } from "convex/values";
import { internalQuery } from "./_generated/server";

export const findDuplicates = internalQuery({
  args: {
    table: v.union(v.literal("profile"), v.literal('users'))
  },
  handler: async (ctx, args) => {
    const record = await ctx.db.query(args.table).collect()
    const unique = new Set();
    const duplicates = [];

    for (const user of record) {
      if (!user?.email) continue;

      if (unique.has(user.email)) {
        duplicates.push(user.email)
      } else {
        unique.add(user.email);
      }
    }

    return duplicates;
  },
});
