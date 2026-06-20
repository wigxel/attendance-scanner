/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as identities from "../identities.js";
import type * as permissions from "../permissions.js";
import type * as roles from "../roles.js";
import type * as seed from "../seed.js";
import type * as utils from "../utils.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  identities: typeof identities;
  permissions: typeof permissions;
  roles: typeof roles;
  seed: typeof seed;
  utils: typeof utils;
}>;
export type Mounts = {
  identities: {
    deleteIdentity: FunctionReference<
      "mutation",
      "public",
      { callerId: string; identityId: string },
      any
    >;
    hasAll: FunctionReference<
      "query",
      "public",
      { identity: string; privileges: Array<string> },
      any
    >;
    hasAny: FunctionReference<
      "query",
      "public",
      { identity: string; privileges: Array<string> },
      any
    >;
    hasPrivilege: FunctionReference<
      "query",
      "public",
      { identity: string; privilege: string },
      any
    >;
    listIdentities: FunctionReference<
      "query",
      "public",
      { callerId: string },
      any
    >;
    registerIdentity: FunctionReference<
      "mutation",
      "public",
      { callerId: string; identity: string; roleId: string },
      any
    >;
    updateIdentityRole: FunctionReference<
      "mutation",
      "public",
      { callerId: string; identityId: string; roleId: string },
      any
    >;
  };
  permissions: {
    createPermission: FunctionReference<
      "mutation",
      "public",
      { callerId: string; category: string; description: string; name: string },
      any
    >;
    deletePermission: FunctionReference<
      "mutation",
      "public",
      { callerId: string; permissionId: string },
      any
    >;
    listPermissions: FunctionReference<
      "query",
      "public",
      { callerId: string },
      any
    >;
    listPermissionsByCategory: FunctionReference<
      "query",
      "public",
      { callerId: string },
      any
    >;
    updatePermission: FunctionReference<
      "mutation",
      "public",
      {
        callerId: string;
        category: string;
        description: string;
        name: string;
        permissionId: string;
      },
      any
    >;
  };
  roles: {
    createRole: FunctionReference<
      "mutation",
      "public",
      {
        callerId: string;
        description: string;
        name: string;
        privileges: Array<string>;
      },
      any
    >;
    deleteRole: FunctionReference<
      "mutation",
      "public",
      { callerId: string; roleId: string },
      any
    >;
    getRoles: FunctionReference<"query", "public", { callerId: string }, any>;
    updateRole: FunctionReference<
      "mutation",
      "public",
      {
        callerId: string;
        description: string;
        name: string;
        privileges: Array<string>;
        roleId: string;
      },
      any
    >;
  };
  seed: {
    seedPermissions: FunctionReference<"mutation", "public", {}, any>;
    seedRoles: FunctionReference<"mutation", "public", {}, any>;
  };
};
// For now fullApiWithMounts is only fullApi which provides
// jump-to-definition in component client code.
// Use Mounts for the same type without the inference.
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};
