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
    identities: {
      deleteIdentity: FunctionReference<
        "mutation",
        "internal",
        { callerId: string; identityId: string },
        any,
        Name
      >;
      hasAll: FunctionReference<
        "query",
        "internal",
        { identity: string; privileges: Array<string> },
        any,
        Name
      >;
      hasAny: FunctionReference<
        "query",
        "internal",
        { identity: string; privileges: Array<string> },
        any,
        Name
      >;
      hasPrivilege: FunctionReference<
        "query",
        "internal",
        { identity: string; privilege: string },
        any,
        Name
      >;
      listIdentities: FunctionReference<
        "query",
        "internal",
        { callerId: string },
        any,
        Name
      >;
      registerIdentity: FunctionReference<
        "mutation",
        "internal",
        { callerId: string; identity: string; roleId: string },
        any,
        Name
      >;
      updateIdentityRole: FunctionReference<
        "mutation",
        "internal",
        { callerId: string; identityId: string; roleId: string },
        any,
        Name
      >;
    };
    permissions: {
      createPermission: FunctionReference<
        "mutation",
        "internal",
        {
          callerId: string;
          category: string;
          description: string;
          name: string;
        },
        any,
        Name
      >;
      deletePermission: FunctionReference<
        "mutation",
        "internal",
        { callerId: string; permissionId: string },
        any,
        Name
      >;
      listPermissions: FunctionReference<
        "query",
        "internal",
        { callerId: string },
        any,
        Name
      >;
      listPermissionsByCategory: FunctionReference<
        "query",
        "internal",
        { callerId: string },
        any,
        Name
      >;
      updatePermission: FunctionReference<
        "mutation",
        "internal",
        {
          callerId: string;
          category: string;
          description: string;
          name: string;
          permissionId: string;
        },
        any,
        Name
      >;
    };
    roles: {
      createRole: FunctionReference<
        "mutation",
        "internal",
        {
          callerId: string;
          description: string;
          name: string;
          privileges: Array<string>;
        },
        any,
        Name
      >;
      deleteRole: FunctionReference<
        "mutation",
        "internal",
        { callerId: string; roleId: string },
        any,
        Name
      >;
      getRoles: FunctionReference<
        "query",
        "internal",
        { callerId: string },
        any,
        Name
      >;
      getRolesById: FunctionReference<
        "query",
        "internal",
        { callerId: string; roleId: string },
        any,
        Name
      >;
      updateRole: FunctionReference<
        "mutation",
        "internal",
        {
          callerId: string;
          description: string;
          name: string;
          privileges: Array<string>;
          roleId: string;
        },
        any,
        Name
      >;
    };
    seed: {
      seedPermissions: FunctionReference<"mutation", "internal", {}, any, Name>;
      seedRoles: FunctionReference<"mutation", "internal", {}, any, Name>;
    };
  };
