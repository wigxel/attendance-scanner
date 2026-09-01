import type { GenericMutationCtx } from "convex/server";
import { ConvexError, v } from "convex/values";
import { Effect, Match, Number as Numer, pipe } from "effect";
import { filter } from "effect/Array";
import { TaggedError } from "effect/Data";
import { z } from "zod";
import { safeObj } from "../lib/data.helpers";
import { DurationGroupImpl } from "../lib/date-range";
import { O } from "../lib/fp.helpers";
import type {
  AccessPlan,
  Booking,
  Kobo,
  Naira,
  PlanKey,
  TaggedBooking,
} from "../types";
import type { DataModel, Doc } from "./_generated/dataModel";

export const featureRequestStatus = v.union(
  v.literal("open"),
  v.literal("approved"),
  v.literal("completed"),
  v.literal("rejected"),
);

export const durationTypeConvexSchema = v.union(
  v.literal("day"),
  v.literal("week"),
  v.literal("month"),
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

type OvewriteV1 = Pick<AccessStruct, "kind"> & Partial<AccessFreeStruct>;
type OverwriteV2 = Partial<AccessPaidV2>;
type OverwriteStruct = OvewriteV1 | OverwriteV2;

export const PlanImpl = {
  async validatePlan<TDB extends GenericMutationCtx<DataModel>["db"]>(
    db: TDB,
    plan_string: string,
  ): Promise<AccessPlan> {
    const plan = (await db
      .query("accessPlans")
      .withIndex("plan_key", (gt) => gt.eq("key", plan_string))
      .first()) as AccessPlan | null;

    if (!plan) {
      throw new Error(
        "Invalid plan provided. Registration rejected. Please provide a valid plan",
      );
    }

    return plan;
  },

  toStruct(
    plan: AccessPlan & Partial<AccessStruct>,
  ): AccessFreeStruct | AccessPaidV2 {
    if (plan.key === "free") {
      return { kind: "free" as const };
    }

    if (plan.no_of_days <= 0) {
      throw new Error("no_of_days must be greater than 0");
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

  fromBooking({ booking }: { booking: Booking }): AccessPaidV2 {
    const matcher = pipe(
      BookImpl.match,
      Match.when({ _v: "booking_v2" }, (booking): AccessPaidV2 => {
        return {
          _v: "2",
          kind: "paid",
          planId: booking.planKey,
          duration: { type: "fullday" }, // important! the least booking we have is a fullday
          amountInKobo: booking.pricePerSeat / booking.duration,
          paymentMethod: "bank_transfer",
        };
      }),
      Match.when({ _v: "booking_v1" }, (booking): AccessPaidV2 => {
        const durationGroup = DurationGroupImpl.resolveFromDays(
          booking.duration,
        );

        if (!DurationGroupImpl.valids.has(durationGroup)) {
          throw new ConvexError(
            `Invalid booking duration group: ${durationGroup}`,
          );
        }

        return {
          _v: "2",
          kind: "paid",
          planId: durationGroup as PlanKey,
          duration: { type: "fullday" }, // important! the least booking we have is a fullday
          amountInKobo: +BookImpl.costPerSeat(booking).value,
          paymentMethod: "bank_transfer",
        };
      }),
      Match.orElse(() => {
        throw new ConvexError(`Invalid booking version`);
      }),
    );

    return matcher(BookImpl.normalize(booking));
  },

  normalize(record_: unknown) {
    return Effect.gen(function* () {
      const res = yield* Effect.tryPromise(() =>
        accessPlanSchemaValidator.safeParseAsync(record_),
      );

      if (!res.success) {
        return yield* new PlanError("Invalid AccessStruct provided");
      }

      const record = safeObj(res.data);

      if (record.kind === "free") {
        return record satisfies AccessFreeStruct;
      }

      if (!("_v" in record)) {
        return {
          _v: "2",
          kind: "paid",
          planId: record.planId as PlanKey,
          amountInKobo: record.amount * 100,
          paymentMethod: "bank_transfer",
          duration: { type: "fullday" },
        } satisfies AccessPaidV2;
      }

      return record as AccessPaidV2;
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

  match<TFree, TPaid, TNone>(
    access: { kind: string } & object,
    cases: {
      none: () => TNone;
      free: () => TFree;
      paid: (access: AccessPaidV2 | AccessPaidV1) => TPaid;
    },
  ) {
    return pipe(
      Match.value(access),
      Match.when({ kind: "free" }, () => cases.free()),
      Match.when({ kind: "paid" }, (a) =>
        cases.paid(a as AccessPaidV2 | AccessPaidV1),
      ),
      Match.orElse(() => cases.none()),
    ) as TFree | TPaid | TNone;
  },

  paymentMethod(access: AccessStruct): "bank_transfer" | "cash" {
    return access.kind === "paid" ? access.paymentMethod : "bank_transfer";
  },

  amount(access: AccessStruct): Kobo {
    const invalidAmountError = new Error(
      "Failed to resolve amount. Invalid access struct",
    );

    const duration = PlanImpl.duration(access);

    const v2Matcher = pipe(
      Match.type<AccessPaidV2>(),
      Match.when({ planId: "hourly" }, (record) => {
        return pipe(
          duration,
          O.flatMap((dur) =>
            dur.type === "hourly"
              ? Numer.parse(dur.value.toString())
              : O.none(),
          ),
          O.map((hours) => {
            return CurrencyImpl.kobo(record.amountInKobo * hours);
          }),
          O.getOrThrowWith(() => new PlanError("Duration must be present")),
        );
      }),
      Match.when(
        { planId: Match.nonEmptyString, amountInKobo: Match.number },
        (record) => {
          return CurrencyImpl.kobo(record.amountInKobo);
        },
      ),
      Match.orElse(() => {
        throw invalidAmountError;
      }),
    );

    const resolveAmount = (record: AccessPaidV1 | AccessPaidV2) => {
      return pipe(
        Match.value(record),
        Match.when({ _v: "2" }, v2Matcher),
        Match.when({ amount: Match.any }, (record) =>
          CurrencyImpl.nairaToKobo(record.amount),
        ),
        Match.orElse(() => {
          throw invalidAmountError;
        }),
      );
    };

    return PlanImpl.match(access, {
      none: () => CurrencyImpl.empty,
      free: () => CurrencyImpl.empty,
      paid: resolveAmount,
    });
  },

  toOverwrite(
    prev: AccessFreeStruct | AccessPaidV2,
    overwrite: OverwriteStruct,
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
  planId: PlanKey;
  amountInKobo: number;
  paymentMethod: "cash" | "bank_transfer";
  duration?: AccessDuration;
};

type AccessPaidV1 = {
  kind: "paid";
  planId: PlanKey;
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

type DailyRegister = Doc<"daily_register">;

export const RegisterImpl = {
  filterPaid: filter<DailyRegister>((r) => r.access.kind === "paid"),

  filterCash: filter<DailyRegister>((r) => {
    return (
      PlanImpl.type("paid")(r.access) &&
      PlanImpl.paymentMethod(r.access) === "cash"
    );
  }),

  sumAll: (collection: DailyRegister[]) => {
    return collection.reduce((accumKoboAmount, r) => {
      return PlanImpl.match(r.access, {
        free: () => accumKoboAmount,
        none: () => accumKoboAmount,
        paid: (value) => accumKoboAmount + +PlanImpl.amount(value).value,
      });
    }, 0);
  },
};

const CurrencyImpl = {
  empty: {
    currency: "naira",
    denomination: "kobo",
    value: "0",
  } satisfies Kobo,

  kobo(amount: number): Kobo {
    return {
      currency: "naira",
      denomination: "kobo",
      value: String(amount),
    };
  },

  /** @deprecated Do not use. Always prefer kobo  */
  naira(): Naira {
    throw new Error("Use kobo instead");
  },

  nairaToKobo(amount: number): Kobo {
    return {
      currency: "naira",
      denomination: "kobo",
      value: String(amount * 100),
    };
  },

  koboToNaira(amount: number): Naira {
    return {
      currency: "naira",
      denomination: "naira",
      value: String(amount / 100),
    };
  },

  add(a: Kobo, b: Kobo): Kobo {
    return {
      currency: "naira",
      denomination: "kobo",
      value: pipe(
        O.all([Numer.parse(a.value), Numer.parse(b.value)]),
        O.map(Numer.sumAll),
        O.map(String),
        O.getOrThrow,
      ),
    };
  },
};

export const BookImpl = {
  normalize(booking: Booking): TaggedBooking {
    if (booking == null) throw new Error("Booking is undefined");

    const safeBooking = safeObj(booking);

    if ("planKey" in safeBooking && safeBooking.planKey) {
      return {
        _v: "booking_v2",
        ...safeBooking,
        planKey: safeBooking.planKey,
      };
    }

    return {
      _v: "booking_v1",
      ...safeBooking,
    };
  },

  match: Match.type<TaggedBooking>(),

  costPerSeat(booking: TaggedBooking): Kobo {
    return CurrencyImpl.kobo(booking.pricePerSeat / booking.duration);
  },
};
