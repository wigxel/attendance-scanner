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
      archive: FunctionReference<
        "mutation",
        "internal",
        { id: string; recipientKey: string },
        any,
        Name
      >;
      enqueue: FunctionReference<
        "mutation",
        "internal",
        {
          body: string;
          dedupeKey?: string;
          recipientKey: string;
          title: string;
          url?: string;
        },
        any,
        Name
      >;
      list: FunctionReference<
        "query",
        "internal",
        { archived?: boolean; limit?: number; recipientKey: string },
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
      markRead: FunctionReference<
        "mutation",
        "internal",
        { id: string; recipientKey: string },
        any,
        Name
      >;
      unarchive: FunctionReference<
        "mutation",
        "internal",
        { id: string; recipientKey: string },
        any,
        Name
      >;
      unreadCount: FunctionReference<
        "query",
        "internal",
        { recipientKey: string },
        any,
        Name
      >;
    };
  };
