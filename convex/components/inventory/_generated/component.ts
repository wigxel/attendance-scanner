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
 * ```js
 * async function myFunction(ctx: QueryCtx, component: ComponentApi) {
 *   return ctx.runQuery(component.someFile.someQuery, { ...args });
 * }
 * ```
 */
export type ComponentApi<Name extends string | undefined = string | undefined> =
  {
    products: {
      archive: FunctionReference<
        "mutation",
        "internal",
        { callerId: string; productId: string },
        any,
        Name
      >;
      create: FunctionReference<
        "mutation",
        "internal",
        {
          baseUnitId: string;
          callerId: string;
          costPriceKobo?: number;
          name: string;
          reorderLevel?: number;
          sellPriceKobo?: number;
          sku?: string;
        },
        any,
        Name
      >;
      list: FunctionReference<
        "query",
        "internal",
        { includeArchived?: boolean; search?: string },
        any,
        Name
      >;
      update: FunctionReference<
        "mutation",
        "internal",
        {
          baseUnitId: string;
          callerId: string;
          costPriceKobo: number;
          name: string;
          productId: string;
          reorderLevel: number;
          sellPriceKobo?: number;
          sku?: string;
        },
        any,
        Name
      >;
    };
    units: {
      archive: FunctionReference<
        "mutation",
        "internal",
        { unitId: string },
        any,
        Name
      >;
      create: FunctionReference<
        "mutation",
        "internal",
        { abbreviation?: string; callerId: string; name: string },
        any,
        Name
      >;
      list: FunctionReference<
        "query",
        "internal",
        { includeArchived?: boolean },
        any,
        Name
      >;
      rename: FunctionReference<
        "mutation",
        "internal",
        { abbreviation?: string; name: string; unitId: string },
        any,
        Name
      >;
      seedDefaultUnits: FunctionReference<
        "mutation",
        "internal",
        {},
        any,
        Name
      >;
    };
  };
