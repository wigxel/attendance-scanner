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
    index: {
      claim: FunctionReference<
        "mutation",
        "internal",
        { limit?: number; now: number },
        any,
        Name
      >;
      enqueue: FunctionReference<
        "mutation",
        "internal",
        {
          body: string;
          channels?: Array<"inApp" | "push" | "email">;
          dedupeKey?: string;
          recipientKey: string;
          title: string;
          to?: string;
          url?: string;
        },
        any,
        Name
      >;
      getPreferences: FunctionReference<
        "query",
        "internal",
        { recipientKey: string },
        any,
        Name
      >;
      listDeliveries: FunctionReference<
        "query",
        "internal",
        {
          limit?: number;
          recipientKey?: string;
          status?: "pending" | "sending" | "sent" | "failed";
        },
        any,
        Name
      >;
      listInApp: FunctionReference<
        "query",
        "internal",
        { limit?: number; recipientKey: string },
        any,
        Name
      >;
      markAllRead: FunctionReference<
        "mutation",
        "internal",
        { recipientKey: string },
        any,
        Name
      >;
      markFailed: FunctionReference<
        "mutation",
        "internal",
        { deliveryId: string; error: string; retryable?: boolean },
        any,
        Name
      >;
      markRead: FunctionReference<
        "mutation",
        "internal",
        { deliveryId: string; recipientKey: string },
        any,
        Name
      >;
      markSent: FunctionReference<
        "mutation",
        "internal",
        { deliveryId: string },
        any,
        Name
      >;
      setPreferences: FunctionReference<
        "mutation",
        "internal",
        { email?: boolean; push?: boolean; recipientKey: string },
        any,
        Name
      >;
    };
  };
