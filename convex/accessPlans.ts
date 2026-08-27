import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { internalMutation, mutation, query } from "./_generated/server";
import { requirePrivilege } from "./acl";
import { planDeletedAudit } from "./audits/entities";
import { readId } from "./myFunctions";

export const getByKey = query({
  args: { planKey: v.string() },
  handler: async (ctx, { planKey }): Promise<Doc<"accessPlans"> | null> => {
    return await ctx.db
      .query("accessPlans")
      .withIndex("plan_key", (q) => q.eq("key", planKey))
      .first();
  },
});

export const getPlan = query({
  args: { planKey: v.string() },
  handler: async (ctx, { planKey }): Promise<Doc<"accessPlans"> | null> => {
    return ctx.db
      .query("accessPlans")
      .withIndex("plan_key", (q) => q.eq("key", planKey))
      .first();
  },
});

export const getByDuration = query({
  args: { noOfDays: v.number() },
  handler: async (ctx, { noOfDays }): Promise<Doc<"accessPlans"> | null> => {
    return ctx.db
      .query("accessPlans")
      .filter((q) => q.eq(q.field("no_of_days"), noOfDays))
      .first();
  },
});

export const list = query({
  handler: async (ctx): Promise<Doc<"accessPlans">[]> => {
    return ctx.db.query("accessPlans").collect();
  },
});

export const add = mutation({
  args: {
    key: v.string(),
    name: v.string(),
    price: v.number(),
    no_of_days: v.number(),
    description: v.optional(v.string()),
    features: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("accessPlans")
      .withIndex("plan_key", (q) => q.eq("key", args.key))
      .first();

    if (existing) {
      throw new ConvexError(`Plan with key "${args.key}" already exists`);
    }

    const planId = ctx.db.insert("accessPlans", {
      key: args.key,
      name: args.name,
      price: args.price,
      no_of_days: args.no_of_days,
      description: args.description ?? "",
      features: args.features ?? [],
    });

    return planId;
  },
});

export const update = mutation({
  args: {
    id: v.id("accessPlans"),
    name: v.string(),
    price: v.number(),
    no_of_days: v.number(),
    description: v.optional(v.string()),
    features: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);

    if (!existing) {
      throw new ConvexError("Plan not found");
    }

    await ctx.db.patch(args.id, {
      name: args.name,
      price: args.price,
      no_of_days: args.no_of_days,
      description: args.description ?? "",
      features: args.features ?? [],
    });

    return args.id;
  },
});

export const remove = mutation({
  args: {
    id: v.id("accessPlans"),
  },
  handler: async (ctx, args) => {
    await requirePrivilege(ctx, "plans:manage");

    const existing = await ctx.db.get(args.id);

    if (!existing) {
      throw new ConvexError("Plan not found");
    }

    const actorId = await readId(ctx);
    if (!actorId) throw new ConvexError("Authentication required.");

    await ctx.db.delete(args.id);

    await ctx.scheduler.runAfter(
      0,
      internal.audit.log,
      planDeletedAudit({
        actorId,
        targetId: args.id,
        key: existing.key,
        name: existing.name,
      }),
    );

    return args.id;
  },
});

export const seedAccessPlans = internalMutation({
  handler: async (ctx) => {
    const defaults = [
      {
        key: "daily",
        name: "Daily",
        price: 1500,
        no_of_days: 1,
        description: "Daily access pass",
        features: [] as string[],
      },
      {
        key: "weekly",
        name: "Weekly",
        price: 6000,
        no_of_days: 7,
        description: "7-day access pass",
        features: ["priority-check-in"],
      },
      {
        key: "monthly",
        name: "Monthly",
        price: 24000,
        no_of_days: 24,
        description: "24-working-day access pass",
        features: ["priority-check-in", "booking"],
      },
      {
        key: "daily_night",
        name: "Daily Night",
        price: 1000,
        no_of_days: 1,
        description: "Night session pass (8pm - 8am)",
        features: [] as string[],
      },
      {
        key: "weekly_night",
        name: "Weekly Night",
        price: 5000,
        no_of_days: 7,
        description: "7-night session pass (8pm - 8am)",
        features: ["priority-check-in"],
      },
      {
        key: "monthly_night",
        name: "Monthly Night",
        price: 20000,
        no_of_days: 24,
        description: "24-night session pass (8pm - 8am)",
        features: ["priority-check-in", "booking"],
      },
      {
        key: "calendar_month",
        name: "Calendar Month",
        price: 20000,
        no_of_days: 31,
        description: "Full calendar month",
        features: ["priority-check-in", "booking"],
      },
    ];

    const existing = await ctx.db.query("accessPlans").collect();
    const existingKeys = new Set(existing.map((p) => p.key));

    let seeded = 0;
    for (const plan of defaults) {
      if (!existingKeys.has(plan.key)) {
        await ctx.db.insert("accessPlans", plan);
        seeded++;
      }
    }

    return { seeded };
  },
});
