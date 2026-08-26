import { Schema } from "effect";
import { brand } from "effect/Schema";

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type DurationType = "day" | "week" | "month" | "full_month";

export type KnownPlanKey = "daily" | "weekly" | "monthly" | "calendar_month";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _PLAN_KEY = Schema.String.pipe(brand("PlanKey"));

export type PlanKey = KnownPlanKey | Schema.Schema.Type<typeof _PLAN_KEY>;
