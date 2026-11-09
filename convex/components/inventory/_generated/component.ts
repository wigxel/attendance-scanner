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
    productUnits: {
      list: FunctionReference<
        "query",
        "internal",
        { productId: string },
        any,
        Name
      >;
      listAll: FunctionReference<"query", "internal", {}, any, Name>;
      upsert: FunctionReference<
        "mutation",
        "internal",
        { factorToBase: number; productId: string; unitId: string },
        any,
        Name
      >;
    };
    purchases: {
      create: FunctionReference<
        "mutation",
        "internal",
        {
          amountPaidKobo?: number;
          callerId: string;
          discountKobo?: number;
          freightKobo?: number;
          lines: Array<{
            productId: string;
            quantity: number;
            unitCostKobo: number;
            unitId: string;
          }>;
          note?: string;
          occurredAt?: string;
          supplierId?: string;
        },
        any,
        Name
      >;
      get: FunctionReference<
        "query",
        "internal",
        { purchaseId: string },
        any,
        Name
      >;
      linesInRange: FunctionReference<
        "query",
        "internal",
        { end: string; start: string },
        any,
        Name
      >;
      list: FunctionReference<"query", "internal", {}, any, Name>;
      voidPurchase: FunctionReference<
        "mutation",
        "internal",
        { callerId: string; purchaseId: string },
        any,
        Name
      >;
    };
    sales: {
      create: FunctionReference<
        "mutation",
        "internal",
        {
          callerId: string;
          channel: "cash" | "pos" | "transfer";
          customerId?: string;
          lines: Array<{
            productId: string;
            quantity: number;
            unitId: string;
            unitPriceKobo: number;
          }>;
          note?: string;
        },
        any,
        Name
      >;
      get: FunctionReference<
        "query",
        "internal",
        { saleId: string },
        any,
        Name
      >;
      linesInRange: FunctionReference<
        "query",
        "internal",
        { end: string; start: string },
        any,
        Name
      >;
      list: FunctionReference<"query", "internal", {}, any, Name>;
      range: FunctionReference<
        "query",
        "internal",
        { end: string; start: string },
        any,
        Name
      >;
      setSaleCustomer: FunctionReference<
        "mutation",
        "internal",
        { customerId?: string; saleId: string },
        any,
        Name
      >;
      voidSale: FunctionReference<
        "mutation",
        "internal",
        { callerId: string; saleId: string },
        any,
        Name
      >;
    };
    stockMovements: {
      history: FunctionReference<
        "query",
        "internal",
        { limit?: number; productId: string },
        any,
        Name
      >;
      levels: FunctionReference<
        "query",
        "internal",
        { includeArchived?: boolean },
        any,
        Name
      >;
      range: FunctionReference<
        "query",
        "internal",
        { end: string; start: string },
        any,
        Name
      >;
      record: FunctionReference<
        "mutation",
        "internal",
        {
          callerId: string;
          kind: "restock" | "usage" | "adjustment";
          note?: string;
          occurredAt?: string;
          productId: string;
          quantity: number;
        },
        any,
        Name
      >;
      recordBulkAdjustment: FunctionReference<
        "mutation",
        "internal",
        {
          callerId: string;
          note?: string;
          rows: Array<{ productId: string; quantity?: number }>;
        },
        any,
        Name
      >;
    };
    suppliers: {
      archive: FunctionReference<
        "mutation",
        "internal",
        { supplierId: string },
        any,
        Name
      >;
      create: FunctionReference<
        "mutation",
        "internal",
        {
          callerId: string;
          contactName?: string;
          name: string;
          notes?: string;
          phone?: string;
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
          contactName?: string;
          name: string;
          notes?: string;
          phone?: string;
          supplierId: string;
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
