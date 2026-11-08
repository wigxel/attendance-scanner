/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as defaultUnits from "../defaultUnits.js";
import type * as productUnits from "../productUnits.js";
import type * as products from "../products.js";
import type * as purchases from "../purchases.js";
import type * as stockMovements from "../stockMovements.js";
import type * as suppliers from "../suppliers.js";
import type * as units from "../units.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import { anyApi, componentsGeneric } from "convex/server";

const fullApi: ApiFromModules<{
  defaultUnits: typeof defaultUnits;
  productUnits: typeof productUnits;
  products: typeof products;
  purchases: typeof purchases;
  stockMovements: typeof stockMovements;
  suppliers: typeof suppliers;
  units: typeof units;
}> = anyApi as any;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
> = anyApi as any;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
> = anyApi as any;

export const components = componentsGeneric() as unknown as {};
