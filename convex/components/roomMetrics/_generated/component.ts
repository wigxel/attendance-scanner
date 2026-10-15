/* eslint-disable */
/**
 * Generated `ComponentApi` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";

/**
 * A utility for referencing a Convex component's exposed API.
 *
 * Useful when expecting a parameter like `components.myComponent`.
 * Usage:
 * ```ts
 * async function myFunction(ctx: QueryCtx, component: ComponentApi) {
 *   return ctx.runQuery(component.someFile.someQuery, { ...args });
 * }
 * ```
 */
export type ComponentApi<Name extends string | undefined = string | undefined> =
  {
    alerts: {
      acknowledge: FunctionReference<
        "mutation",
        "internal",
        { alertId: string },
        any,
        Name
      >;
      markNotified: FunctionReference<
        "mutation",
        "internal",
        { alertId: string },
        any,
        Name
      >;
      recentAlerts: FunctionReference<
        "query",
        "internal",
        { limit?: number; type?: string },
        any,
        Name
      >;
      unnotifiedAlerts: FunctionReference<"query", "internal", {}, any, Name>;
    };
    index: {
      getDailyCalendar: FunctionReference<
        "query",
        "internal",
        { days?: number; roomId?: string },
        any,
        Name
      >;
      getLast7DaysStrip: FunctionReference<
        "query",
        "internal",
        { asOf?: number; roomId?: string },
        any,
        Name
      >;
      getLiveReading: FunctionReference<
        "query",
        "internal",
        { roomId?: string },
        any,
        Name
      >;
      getRawReading: FunctionReference<
        "query",
        "internal",
        { roomId?: string },
        any,
        Name
      >;
      history: FunctionReference<
        "query",
        "internal",
        { limit?: number; roomId?: string },
        any,
        Name
      >;
      lastReading: FunctionReference<"query", "internal", {}, any, Name>;
      store: FunctionReference<
        "mutation",
        "internal",
        {
          deviceId?: string;
          humidity: number;
          pressure: number;
          roomId?: string;
          temperature: number;
          timestamp?: number;
        },
        any,
        Name
      >;
    };
  };
