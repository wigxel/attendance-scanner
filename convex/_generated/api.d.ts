/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as acl from "../acl.js";
import type * as audit from "../audit.js";
import type * as auth from "../auth.js";
import type * as bookings from "../bookings.js";
import type * as clerk from "../clerk.js";
import type * as config from "../config.js";
import type * as crons from "../crons.js";
import type * as customers from "../customers.js";
import type * as http from "../http.js";
import type * as metrics from "../metrics.js";
import type * as migrations from "../migrations.js";
import type * as myFunctions from "../myFunctions.js";
import type * as permissions from "../permissions.js";
import type * as register from "../register.js";
import type * as register_common from "../register_common.js";
import type * as reports from "../reports.js";
import type * as roles from "../roles.js";
import type * as seatOrchestrator from "../seatOrchestrator.js";
import type * as seats from "../seats.js";
import type * as seedScanRecords from "../seedScanRecords.js";
import type * as seedSeats from "../seedSeats.js";
import type * as selfService from "../selfService.js";
import type * as shared from "../shared.js";
import type * as utils from "../utils.js";
import type * as webhooks from "../webhooks.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  acl: typeof acl;
  audit: typeof audit;
  auth: typeof auth;
  bookings: typeof bookings;
  clerk: typeof clerk;
  config: typeof config;
  crons: typeof crons;
  customers: typeof customers;
  http: typeof http;
  metrics: typeof metrics;
  migrations: typeof migrations;
  myFunctions: typeof myFunctions;
  permissions: typeof permissions;
  register: typeof register;
  register_common: typeof register_common;
  reports: typeof reports;
  roles: typeof roles;
  seatOrchestrator: typeof seatOrchestrator;
  seats: typeof seats;
  seedScanRecords: typeof seedScanRecords;
  seedSeats: typeof seedSeats;
  selfService: typeof selfService;
  shared: typeof shared;
  utils: typeof utils;
  webhooks: typeof webhooks;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  wigxel_acl: import("../components/acl/_generated/component.js").ComponentApi<"wigxel_acl">;
  aggregate: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"aggregate">;
  customerStats: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"customerStats">;
};
