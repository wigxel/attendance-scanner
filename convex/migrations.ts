import { v } from "convex/values";
import { isNullable } from "effect/Predicate";
import { internalMutation } from "./_generated/server";
import { PlanImpl } from "./shared";

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
      if (isNullable(record.method)) {
        await ctx.db.patch(record._id, { method: "qr" });
        updated++;
      }
    }

    return { updated };
  },
});

export const fixDailyAmountKobo = internalMutation({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? true;

    const registers = await ctx.db.query("daily_register").collect();

    const candidates = registers.filter((r) => PlanImpl.isV2(r.access))
      .map((r) => {
        const access = r.access as { amountInKobo: number; planId: string };
        const base = access.planId === "daily" && access.amountInKobo === 3000 ? 300000 : access.amountInKobo;
        const next = Math.round(base);
        return next !== access.amountInKobo
          ? { id: r._id, from: access.amountInKobo, to: next, planId: access.planId, access: r.access }
          : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    if (dryRun) {
      return {
        dryRun: true as const,
        wouldUpdate: candidates.length,
        preview: candidates.slice(0, 10).map(({ id, from, to, planId }) => ({ id, from, to, planId })),
        updated: 0,
      };
    }

    // biome-ignore lint/suspicious/noExplicitAny: Too complex
    await Promise.all(candidates.map(({ id, to, access }) => ctx.db.patch(id, { access: { ...(access as any), amountInKobo: to } } as any)));
    return { dryRun: false as const, updated: candidates.length, wouldUpdate: candidates.length };
  },
});
