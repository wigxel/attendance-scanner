import type { GenericMutationCtx } from "convex/server";
import { v } from "convex/values";
import { Effect, Match, pipe } from "effect";
import { TaggedError } from "effect/Data";
import { z } from "zod";
import { safeObj } from "../lib/data.helpers";
import { O } from "../lib/fp.helpers";
import type { Doc } from "./_generated/dataModel";

export const featureRequestStatus = v.union(
  v.literal("open"),
  v.literal("completed"),
  v.literal("rejected"),
);

export const accessPlanStruct = v.union(
  v.object({
    kind: v.literal("free"),
  }),
  v.object({
    kind: v.literal("paid"),
    planId: v.string(),
    amount: v.number(),
  }),
  v.object({
    _v: v.literal("2"),
    kind: v.literal("paid"),
    planId: v.string(),
    amountInKobo: v.number(),
    paymentMethod: v.union(v.literal("cash"), v.literal("bank_transfer")),
    duration: v.optional(v.any()),
  }),
);

const durationSchemaValidator = z.union([
  z.object({
    type: z.literal("hourly"),
    value: z
      .number()
      .min(1, { message: "Hourly value must be at least 1h" })
      .max(6, { message: "Hourly value cannot exceed 6" }),
  }),
  z.object({
    type: z.literal("fullday"),
  }),
]);

export const accessPlanSchemaValidator = z.union([
  z.object({
    kind: z.literal("free"),
  }),
  z.object({
    kind: z.literal("paid"),
    planId: z.string(),
    amount: z.number(),
  }),
  z.object({
    _v: z.literal("2"),
    kind: z.literal("paid"),
    planId: z.string(),
    amountInKobo: z.number(),
    paymentMethod: z.union([z.literal("cash"), z.literal("bank_transfer")]),
    duration: z.optional(durationSchemaValidator),
  }),
]);

export const PlanImpl = {
  async validatePlan<TDB extends GenericMutationCtx<any>["db"]>(
    db: TDB,
    plan_string: string,
  ): Promise<Doc<"accessPlans">> {
    const plan = await db
      .query("accessPlans")
      .withIndex("plan_key", (gt) => gt.eq("key", plan_string))
      .first();

    if (!plan) {
      throw new Error(
        "Invalid plan provided. Registration rejected. Please provide a valid plan",
      );
    }

    return plan;
  },

  toStruct(
    plan: Doc<"accessPlans"> & Partial<AccessStruct>,
  ): AccessFreeStruct | AccessPaidV2 {
    if (plan.key === "free") {
      return { kind: "free" as const };
    }

    return {
      _v: "2",
      kind: "paid" as const,
      planId: plan.key,
      amountInKobo: Math.max(0, plan.price / plan.no_of_days),
      paymentMethod: "bank_transfer",
      duration: { type: "fullday" },
    };
  },

  fromBooking(booking: Doc<"bookings">): AccessPaidV2 {
    return {
      _v: "2",
      kind: "paid",
      planId: booking.durationType,
      duration: { type: "fullday" },
      amountInKobo: booking.pricePerSeat / booking.duration,
      paymentMethod: "bank_transfer",
    };
  },

  normalize(record_: unknown) {
    return Effect.gen(function* () {
      const res = yield* Effect.tryPromise(() =>
        accessPlanSchemaValidator.safeParseAsync(record_),
      );

      if (!res.success) {
        return yield* new PlanError("Invalid AccessStruct provided");
      }

      const record = res.data;

      if (record.kind === "free") {
        return record satisfies AccessFreeStruct;
      }

      if (!("_v" in record)) {
        return {
          _v: "2",
          kind: "paid",
          planId: record.planId,
          amountInKobo: record.amount * 100,
          paymentMethod: "bank_transfer",
          duration: { type: "fullday" },
        } satisfies AccessPaidV2;
      }

      return record satisfies AccessPaidV2;
    });
  },

  async validate(_type: "duration", duration: unknown) {
    return await durationSchemaValidator.safeParseAsync(duration);
  },

  duration(access?: AccessStruct): O.Option<AccessDuration> {
    return PlanImpl.type("paid")(access)
      ? O.fromNullable(access.duration)
      : O.none();
  },

  type(type: "paid" | "free") {
    const type_is = (access: unknown, value: "paid" | "free") => {
      const safe_accesss = safeObj(access);

      if (!("kind" in safe_accesss)) return false;

      return safe_accesss.kind === value;
    };

    if (type === "paid") {
      return (access: unknown): access is AccessPaidV2 => {
        return type_is(access, "paid");
      };
    }

    return (access: unknown): access is AccessPaidV2 => {
      return type_is(access, "free");
    };
  },

  paymentMethod(access: AccessStruct): "bank_transfer" | "cash" {
    return access.kind === "paid" ? access.paymentMethod : "bank_transfer";
  },

  toOverwrite(
    prev: AccessFreeStruct | AccessPaidV2,
    overwrite:
      | (Pick<AccessStruct, "kind"> & Partial<AccessFreeStruct>)
      | Partial<AccessPaidV2>,
  ): O.Option<AccessStruct> {
    const tags = [prev, overwrite] as const;

    const free = O.some({ kind: "free" as const });

    return pipe(
      Match.value(tags),
      Match.when([{ kind: "free" }, { kind: "free" }], () => free),
      Match.when([{ kind: "paid" }, { kind: "free" }], () => free),
      Match.when(
        [{ kind: "free" }, { kind: "paid" }],
        (): O.Option<AccessPaidV2> => {
          if (prev.kind === "free") return O.none();
          if (overwrite.kind === "free") return O.none();

          return O.some({ ...prev, ...overwrite });
        },
      ),
      Match.when(
        [{ kind: "paid" }, { kind: "paid" }],
        (): O.Option<AccessPaidV2> => {
          const new_record: AccessStruct = prev;

          if (new_record.kind === "free") return O.none();
          if (overwrite.kind === "free") return O.none();

          // overwrite
          return O.some({
            ...new_record,
            ...overwrite,
          } satisfies AccessPaidV2);
        },
      ),
      Match.orElse(() => O.some(prev)),
    );
  },
};

type AccessPaidV2 = {
  _v: "2";
  kind: "paid";
  planId: string;
  amountInKobo: number;
  paymentMethod: "cash" | "bank_transfer";
  duration?: AccessDuration;
};

type AccessPaidV1 = {
  kind: "paid";
  planId: string;
  amount: number;
  paymentMethod: "cash" | "bank_transfer";
};

type AccessFreeStruct = { kind: "free" };

export type AccessStruct = AccessPaidV1 | AccessPaidV2 | AccessFreeStruct;

export type AccessDuration = z.infer<typeof durationSchemaValidator>;

export class PlanError extends TaggedError("PlanError") {
  constructor(public message: string) {
    super();
  }
}
