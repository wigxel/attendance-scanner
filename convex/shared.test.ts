import { Effect, Option } from "effect";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { Booking } from "../types";
import { PlanImpl } from "./shared";

const normalize = (value: unknown) =>
  Effect.runPromise(PlanImpl.normalize(value));

describe("PlanImpl.toOverwrite", () => {
  describe("free → free", () => {
    it("should return Some({ kind: 'free' })", () => {
      const prev = { kind: "free" as const };
      const overwrite = { kind: "free" as const };
      const result = PlanImpl.toOverwrite(prev, overwrite);
      expect(result).toEqual(Option.some({ kind: "free" }));
    });
  });

  describe("paid → free", () => {
    it("should return Some({ kind: 'free' }) for paid v1", async () => {
      const prev = await normalize({
        kind: "paid" as const,
        planId: "p1",
        amount: 5000,
        paymentMethod: "cash" as const,
      });
      const overwrite = { kind: "free" as const };
      const result = PlanImpl.toOverwrite(prev, overwrite);
      expect(result).toEqual(Option.some({ kind: "free" }));
    });

    it("should return Some({ kind: 'free' }) for paid v2", async () => {
      const prev = await normalize({
        _v: "2" as const,
        kind: "paid" as const,
        planId: "p1",
        amountInKobo: 5000,
        paymentMethod: "cash" as const,
      });
      const overwrite = { kind: "free" as const };
      const result = PlanImpl.toOverwrite(prev, overwrite);
      expect(result).toEqual(Option.some({ kind: "free" }));
    });
  });

  describe("free → paid", () => {
    it("should return None because normalize(prev) yields free", async () => {
      const prev = await normalize({ kind: "free" as const });
      const overwrite = {
        kind: "paid" as const,
        planId: "p1",
        amountInKobo: 5000,
        paymentMethod: "bank_transfer" as const,
      };
      const result = PlanImpl.toOverwrite(prev, overwrite);
      expect(Option.isNone(result)).toBe(true);
    });
  });

  describe("paid v1 → paid", () => {
    it("should normalize prev to v2 and merge with overwrite", async () => {
      const prev = await normalize({
        kind: "paid" as const,
        planId: "p1",
        amount: 5000,
        paymentMethod: "cash" as const,
      });
      const overwrite = {
        _v: "2" as const,
        kind: "paid" as const,
        planId: "p2",
        amountInKobo: 10000,
        paymentMethod: "bank_transfer" as const,
      };
      const result = PlanImpl.toOverwrite(prev, overwrite);

      expect(Option.isSome(result)).toBe(true);
      if (Option.isSome(result)) {
        expect(result.value).toEqual({
          _v: "2",
          kind: "paid",
          planId: "p2",
          amountInKobo: 10000,
          paymentMethod: "bank_transfer",
          duration: { type: "fullday" },
        });
      }
    });

    it("should keep prev amount when overwrite does not provide amountInKobo", async () => {
      const prev = await normalize({
        kind: "paid" as const,
        planId: "p1",
        amount: 5000,
        paymentMethod: "cash" as const,
      });
      const overwrite = {
        _v: "2" as const,
        kind: "paid" as const,
        planId: "p2",
        paymentMethod: "bank_transfer" as const,
      };
      const result = PlanImpl.toOverwrite(prev, overwrite);

      expect(Option.isSome(result)).toBe(true);

      if (Option.isSome(result)) {
        expect(result.value).toMatchObject({
          _v: "2",
          kind: "paid",
          planId: "p2",
          amountInKobo: 5000 * 100, // 500000
          paymentMethod: "bank_transfer",
          duration: { type: "fullday" },
        });
      }
    });
  });

  describe("paid v2 → paid", () => {
    it("should merge overwrite into existing v2 record", () => {
      const prev = {
        _v: "2" as const,
        kind: "paid" as const,
        planId: "p1",
        amountInKobo: 5000,
        paymentMethod: "cash" as const,
      };
      const overwrite = {
        _v: "2" as const,
        kind: "paid" as const,
        planId: "p2",
        amountInKobo: 10000,
      };

      const result = PlanImpl.toOverwrite(prev, overwrite);

      expect(Option.isSome(result)).toBe(true);
      if (Option.isSome(result)) {
        expect(result.value).toEqual({
          _v: "2",
          kind: "paid",
          planId: "p2",
          amountInKobo: 10000,
          paymentMethod: "cash",
        });
      }
    });

    it("should preserve prev when overwrite is empty", () => {
      const prev = {
        _v: "2" as const,
        kind: "paid" as const,
        planId: "p1",
        amountInKobo: 5000,
        paymentMethod: "bank_transfer" as const,
      };
      const overwrite = { kind: "paid" as const };
      const result = PlanImpl.toOverwrite(prev, overwrite);

      expect(Option.isSome(result)).toBe(true);

      if (Option.isSome(result)) {
        expect(result.value).toEqual(prev);
      }
    });
  });
});

describe("PlanImpl.normalize", () => {
  describe("free records", () => {
    it("should return free record as is", async () => {
      const record = { kind: "free" as const };
      const result = await normalize(record);
      expect(result).toEqual({ kind: "free" });
    });
  });

  describe("paid v1 records (legacy)", () => {
    it("should normalize paid v1 to v2 schema", async () => {
      const record = { kind: "paid" as const, planId: "p1", amount: 5000 };
      const result = await normalize(record);
      expect(result).toEqual({
        _v: "2",
        kind: "paid",
        planId: "p1",
        amountInKobo: 5000 * 100, // 500000
        paymentMethod: "bank_transfer",
        duration: { type: "fullday" },
      });
    });

    it("should preserve planId when normalizing", async () => {
      const record = {
        kind: "paid" as const,
        planId: "gold_plan",
        amount: 10000,
      };

      const result = await normalize(record);

      // @ts-expect-error No important
      expect(result.planId).toBe("gold_plan");
      // @ts-expect-error No important
      expect(result.amountInKobo).toBe(10000 * 100); // 1000000
      // @ts-expect-error No important
      expect(result.duration).toEqual({ type: "fullday" });
    });

    it("should convert amount to amountInKobo", async () => {
      const record = { kind: "paid" as const, planId: "p1", amount: 1234 };
      const result = await normalize(record);

      // @ts-expect-error No important
      expect(result.amountInKobo).toBe(1234 * 100); // 123400
    });
  });

  describe("paid v2 records", () => {
    it("should return v2 record as is", async () => {
      const record = {
        _v: "2" as const,
        kind: "paid" as const,
        planId: "p1",
        amountInKobo: 5000,
        paymentMethod: "cash" as const,
      };
      const result = await normalize(record);
      expect(result).toEqual(record);
    });

    it("should preserve all v2 fields", async () => {
      const record = {
        _v: "2" as const,
        kind: "paid" as const,
        planId: "premium",
        amountInKobo: 15000,
        paymentMethod: "bank_transfer" as const,
      };
      const result = await normalize(record);
      expect(result).toEqual({
        _v: "2",
        kind: "paid",
        planId: "premium",
        amountInKobo: 15000,
        paymentMethod: "bank_transfer",
      });
    });
  });

  describe("invalid records", () => {
    it("should throw on invalid record", async () => {
      const record = { kind: "unknown" as any };
      await expect(normalize(record)).rejects.toThrow();
    });

    it("should throw on missing required fields", async () => {
      const record = { kind: "paid" as const };
      await expect(normalize(record)).rejects.toThrow();
    });

    it("should throw on incomplete v2 record", async () => {
      const record = { _v: "2" as const, kind: "paid" as const };
      await expect(normalize(record)).rejects.toThrow();
    });
  });
});

describe("PlanImpl.type", () => {
  it("should return type guard for 'free'", () => {
    const isFree = PlanImpl.type("free");

    expect(isFree({ kind: "free" as const })).toBe(true);
    expect(isFree({ kind: "paid" as const, planId: "p1", amount: 1000 })).toBe(
      false,
    );
    expect(isFree(null)).toBe(false);
    expect(isFree(undefined)).toBe(false);
    expect(isFree({})).toBe(false);
    expect(isFree("string")).toBe(false);
  });

  it("should return type guard for 'paid'", () => {
    const isPaid = PlanImpl.type("paid");

    expect(isPaid({ kind: "paid" as const, planId: "p1", amount: 1000 })).toBe(
      true,
    );
    expect(isPaid({ kind: "free" as const })).toBe(false);
    expect(isPaid(null)).toBe(false);
    expect(isPaid(undefined)).toBe(false);
    expect(isPaid({})).toBe(false);
    expect(isPaid("string")).toBe(false);
  });
});

describe("PlanImpl.fromBooking", () => {
  const baseBooking = {
    _id: "" as any,
    _creationTime: 0,
    userId: "u1",
    seatIds: [],
    startDate: "2024-01-01",
    endDate: "2024-01-01",
    amount: 0,
    status: "confirmed" as const,
    createdAt: 0,
    updatedAt: 0,
  };

  it("should return paid v2 access for day booking", () => {
    const booking = {
      ...baseBooking,
      durationType: "day" as const,
      pricePerSeat: 5000,
      duration: 1,
    };
    const result = PlanImpl.fromBooking({ booking });
    expect(result).toStrictEqual({
      _v: "2",
      kind: "paid",
      paymentMethod: "bank_transfer",
      planId: "day",
      duration: { type: "fullday" },
      amountInKobo: 5000,
    });
  });

  it("should return paid v2 access for week booking", () => {
    const booking = {
      ...baseBooking,
      durationType: "week" as const,
      pricePerSeat: 14000,
      duration: 7,
    };
    const result = PlanImpl.fromBooking({ booking });
    expect(result).toStrictEqual({
      _v: "2",
      kind: "paid",
      paymentMethod: "bank_transfer",
      planId: "week",
      duration: { type: "fullday" },
      amountInKobo: 2000,
    });
  });

  it("should return paid v2 access for month booking", () => {
    const booking = {
      ...baseBooking,
      durationType: "month" as const,
      pricePerSeat: 30000,
      duration: 30,
    };
    const result = PlanImpl.fromBooking({ booking });
    expect(result).toStrictEqual({
      _v: "2",
      kind: "paid",
      paymentMethod: "bank_transfer",
      planId: "month",
      duration: { type: "fullday" },
      amountInKobo: 1000,
    });
  });

  it("should handle zero price", () => {
    const booking = {
      ...baseBooking,
      durationType: "day" as const,
      pricePerSeat: 0,
      duration: 1,
    };
    const result = PlanImpl.fromBooking({ booking });
    expect(result).toStrictEqual({
      _v: "2",
      kind: "paid",
      paymentMethod: "bank_transfer",
      planId: "day",
      duration: { type: "fullday" },
      amountInKobo: 0,
    });
  });

  it("should compute fractional amountInKobo", () => {
    const booking = {
      ...baseBooking,
      durationType: "day" as const,
      pricePerSeat: 100,
      duration: 3,
    } satisfies Booking;
    const result = PlanImpl.fromBooking({ booking });
    expect(result).toStrictEqual({
      _v: "2",
      kind: "paid",
      paymentMethod: "bank_transfer",
      planId: "day",
      duration: { type: "fullday" },
      amountInKobo: 100 / 3,
    });
  });

  describe("amount property tests", () => {
    const durationType = fc.constantFrom(
      "day" as const,
      "week" as const,
      "month" as const,
    );
    const pricePerSeat = fc.integer({ min: 0, max: 100 });
    const duration = fc.integer({ min: 1, max: 31 });

    it("amountInKobo is non-negative for any valid inputs", () => {
      fc.assert(
        fc.property(durationType, pricePerSeat, duration, (dt, pps, dur) => {
          const result = PlanImpl.fromBooking({
            booking: {
              ...baseBooking,
              durationType: dt,
              pricePerSeat: pps,
              duration: dur,
            },
          });
          expect(result.amountInKobo).toBeGreaterThanOrEqual(0);
        }),
      );
    });

    it("amountInKobo is proportional to pricePerSeat", () => {
      fc.assert(
        fc.property(
          durationType,
          fc.integer({ min: 1, max: 500_000 }),
          duration,
          (dt, pps, dur) => {
            const base = { ...baseBooking, durationType: dt, duration: dur };
            const low = PlanImpl.fromBooking({
              booking: {
                ...base,
                pricePerSeat: pps,
              },
            }).amountInKobo;
            const high = PlanImpl.fromBooking({
              booking: {
                ...base,
                pricePerSeat: pps * 2,
              },
            }).amountInKobo;
            expect(high).toBe(low * 2);
          },
        ),
      );
    });

    it("amountInKobo is inversely proportional to duration", () => {
      fc.assert(
        fc.property(
          durationType,
          pricePerSeat,
          fc.integer({ min: 1, max: 182 }),
          (dt, pps, dur) => {
            const base = {
              ...baseBooking,
              durationType: dt,
              pricePerSeat: pps,
            };
            const short = PlanImpl.fromBooking({
              booking: {
                ...base,
                duration: dur,
              },
            }).amountInKobo;
            const long = PlanImpl.fromBooking({
              booking: {
                ...base,
                duration: dur * 2,
              },
            }).amountInKobo;
            expect(long).toBe(short / 2);
          },
        ),
      );
    });

    it("amountInKobo is always a finite number", () => {
      fc.assert(
        fc.property(durationType, pricePerSeat, duration, (dt, pps, dur) => {
          const booking = {
            ...baseBooking,
            durationType: dt,
            pricePerSeat: pps,
            duration: dur,
          };
          const result = PlanImpl.fromBooking({ booking });

          expect(Number.isFinite(result.amountInKobo)).toBe(true);
        }),
        { verbose: true },
      );
    });
  });
});

describe("PlanImpl.paymentMethod", () => {
  it("should return bank_transfer for free plan", () => {
    expect(PlanImpl.paymentMethod({ kind: "free" as const })).toBe(
      "bank_transfer",
    );
  });

  it("should return cash for paid plan with cash", () => {
    const params = {
      kind: "paid" as const,
      planId: "p1",
      amountInKobo: 1000,
      paymentMethod: "cash" as const,
    } as any;

    expect(PlanImpl.paymentMethod(params)).toBe("cash");
  });

  it("should return bank_transfer for paid plan with bank_transfer", () => {
    const params = {
      kind: "paid" as const,
      planId: "p1",
      amountInKobo: 1000,
      paymentMethod: "bank_transfer" as const,
    } as any;

    expect(PlanImpl.paymentMethod(params)).toBe("bank_transfer");
  });
});

describe("PlanImpl.duration", () => {
  it("should return None for free access", () => {
    const result = PlanImpl.duration({ kind: "free" });
    expect(Option.isNone(result)).toBe(true);
  });

  it("should return None for paid access without duration", () => {
    const access = {
      _v: "2" as const,
      kind: "paid" as const,
      planId: "day",
      amountInKobo: 5000,
      paymentMethod: "cash" as const,
    };
    const result = PlanImpl.duration(access);
    expect(Option.isNone(result)).toBe(true);
  });

  it("should return Some with hourly duration", () => {
    const access = {
      _v: "2" as const,
      kind: "paid" as const,
      planId: "hourly",
      amountInKobo: 1000,
      paymentMethod: "cash" as const,
      duration: { type: "hourly" as const, value: 3 },
    };
    const result = PlanImpl.duration(access);
    expect(Option.isSome(result)).toBe(true);
    if (Option.isSome(result)) {
      expect(result.value).toEqual({ type: "hourly", value: 3 });
    }
  });

  it("should return Some with fullday duration", () => {
    const access = {
      _v: "2" as const,
      kind: "paid" as const,
      planId: "day",
      amountInKobo: 5000,
      paymentMethod: "bank_transfer" as const,
      duration: { type: "fullday" as const },
    };
    const result = PlanImpl.duration(access);
    expect(Option.isSome(result)).toBe(true);
    if (Option.isSome(result)) {
      expect(result.value).toEqual({ type: "fullday" });
    }
  });

  it("should return None for undefined input", () => {
    const result = PlanImpl.duration(undefined);
    expect(Option.isNone(result)).toBe(true);
  });
});

describe("PlanImpl.match", () => {
  it("should call free case for free access", () => {
    const result = PlanImpl.match(
      { kind: "free" },
      {
        free: () => "free-val",
        paid: () => "paid-val",
        none: () => "none-val",
      },
    );
    expect(result).toBe("free-val");
  });

  it("should call paid case for paid access", () => {
    const access = {
      _v: "2" as const,
      kind: "paid" as const,
      planId: "day",
      amountInKobo: 5000,
      paymentMethod: "cash" as const,
    };
    const result = PlanImpl.match(access, {
      free: () => "free-val",
      paid: (a) => `paid-${a.planId}`,
      none: () => "none-val",
    });
    expect(result).toBe("paid-day");
  });

  it("should call none case for unknown kind", () => {
    const result = PlanImpl.match(
      { kind: "vip" },
      {
        free: () => "free-val",
        paid: () => "paid-val",
        none: () => "none-val",
      },
    );
    expect(result).toBe("none-val");
  });

  it("should pass original access object to paid case", () => {
    const access = {
      _v: "2" as const,
      kind: "paid" as const,
      planId: "week",
      amountInKobo: 10000,
      paymentMethod: "bank_transfer" as const,
    };
    let received: unknown = null;
    PlanImpl.match(access, {
      free: () => {},
      paid: (a) => {
        received = a;
      },
      none: () => {},
    });
    expect(received).toBe(access);
  });
});

describe("PlanImpl.toStruct", () => {
  const basePlan = {
    _id: "plan1" as any,
    _creationTime: 0,
    name: "Test Plan",
    description: "A plan",
    features: [] as string[],
  };

  it("should return free struct for 'free' key", () => {
    const result = PlanImpl.toStruct({
      ...basePlan,
      key: "free",
      price: 0,
      no_of_days: 0,
    });
    expect(result).toEqual({ kind: "free" });
  });

  it("should return paid v2 struct for non-free key", () => {
    const result = PlanImpl.toStruct({
      ...basePlan,
      key: "daily",
      price: 5000,
      no_of_days: 1,
    });
    expect(result).toEqual({
      _v: "2",
      kind: "paid",
      planId: "daily",
      amountInKobo: 5000,
      paymentMethod: "bank_transfer",
      duration: { type: "fullday" },
    });
  });

  it("should divide price by no_of_days", () => {
    const result = PlanImpl.toStruct({
      ...basePlan,
      key: "weekly",
      price: 14000,
      no_of_days: 7,
    });
    expect(result).toMatchObject({ amountInKobo: 2000 });
  });

  it("should clamp negative result to 0", () => {
    const result = PlanImpl.toStruct({
      ...basePlan,
      key: "x",
      price: -100,
      no_of_days: 1,
    });
    expect(result).toMatchObject({ amountInKobo: 0 });
  });

  it("should throw when no_of_days is zero", () => {
    expect(() =>
      PlanImpl.toStruct({
        ...basePlan,
        key: "x",
        price: 5000,
        no_of_days: 0,
      }),
    ).toThrow("no_of_days must be greater than 0");
  });

  it("should throw when no_of_days is negative", () => {
    expect(() =>
      PlanImpl.toStruct({
        ...basePlan,
        key: "x",
        price: 5000,
        no_of_days: -1,
      }),
    ).toThrow("no_of_days must be greater than 0");
  });
});

describe("PlanImpl.amount", () => {
  it("should return zero kobo for free access", () => {
    const result = PlanImpl.amount({ kind: "free" });
    expect(result).toEqual({
      currency: "naira",
      denomination: "kobo",
      value: "0",
    });
  });

  it("should convert v1 paid amount to kobo", () => {
    const access = {
      kind: "paid" as const,
      planId: "p1",
      amount: 50,
      paymentMethod: "cash" as const,
    };
    const result = PlanImpl.amount(access);
    expect(result).toEqual({
      currency: "naira",
      denomination: "kobo",
      value: "5000",
    });
  });

  it("should return amountInKobo for v2 non-hourly plan", () => {
    const access = {
      _v: "2" as const,
      kind: "paid" as const,
      planId: "day",
      amountInKobo: 5000,
      paymentMethod: "cash" as const,
    };
    const result = PlanImpl.amount(access);
    expect(result).toEqual({
      currency: "naira",
      denomination: "kobo",
      value: "500000",
    });
  });

  it("should multiply hourly amountInKobo by hours", () => {
    const access = {
      _v: "2" as const,
      kind: "paid" as const,
      planId: "hourly",
      amountInKobo: 1000,
      paymentMethod: "cash" as const,
      duration: { type: "hourly" as const, value: 3 },
    };
    const result = PlanImpl.amount(access);
    expect(result).toEqual({
      currency: "naira",
      denomination: "kobo",
      value: "3000",
    });
  });

  it("should throw for hourly plan without duration", () => {
    const access = {
      _v: "2" as const,
      kind: "paid" as const,
      planId: "hourly",
      amountInKobo: 1000,
      paymentMethod: "cash" as const,
    };
    expect(() => PlanImpl.amount(access)).toThrow();
  });

  it("should return zero kobo for unknown kind", () => {
    const result = PlanImpl.amount({ kind: "unknown" } as any);
    expect(result).toEqual({
      currency: "naira",
      denomination: "kobo",
      value: "0",
    });
  });
});
