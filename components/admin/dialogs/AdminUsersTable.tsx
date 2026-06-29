"use client";

import { useAction, useQuery } from "convex/react";
import { Trash2 } from "lucide-react";
import { InviteTeamMemberDialog } from "@/components/admin/dialogs/InviteTeamMemberDialog";
import { AppSpinner } from "@/components/loader";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

const roleBadgeStyles: Record<string, string> = {
  admin: "bg-purple-100 text-purple-800",
};

export function AdminUsersTable() {
  const identitiesResult = useQuery(api.acl.listIdentities);
  const downgradeFromAdmin = useAction(api.acl.downgradeFromAdmin);

  const identities = identitiesResult?.success ? identitiesResult.data : [];

  const handleRemoveUser = async (identityId: string, email: string) => {
    if (
      !confirm("Remove this user's admin access? They will lose all roles.")
    ) {
      return;
    }

    try {
      const res = await downgradeFromAdmin({
        identityId,
        email: email || undefined,
      });
      if (res && !res.success) alert(res.error);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove user.");
    }
  };

  const isLoading = identitiesResult === undefined;

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900">
            Administrative Users
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage users who can access the admin panel. Assign roles to control
            their permissions.
          </p>
        </div>

        <InviteTeamMemberDialog />
      </div>
      <div className="mt-4 overflow-hidden rounded-md border border-(--border)">
        <table className="min-w-full divide-y divide-(--border)">
          <thead className="bg-background">
            <tr>
              <th className="py-2.5 pl-4 pr-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                User
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Role
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Joined
              </th>
              <th className="relative py-2.5 pl-3 pr-4">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-(--border)">
            {isLoading ? (
              <tr>
                <td
                  colSpan={4}
                  className="py-8 text-center text-sm text-gray-500"
                >
                  <AppSpinner className="mx-auto " />
                </td>
              </tr>
            ) : identities.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="py-8 text-center text-sm text-gray-500"
                >
                  No administrative users found.
                </td>
              </tr>
            ) : (
              identities.map((entry) => {
                const profile = entry.profile;
                const name = profile
                  ? `${profile.firstName} ${profile.lastName}`
                  : entry.identity;
                const email = profile?.email ?? "";
                const roleName = entry.role?.name ?? "Unknown";

                return (
                  <tr key={entry._id}>
                    <td className="whitespace-nowrap py-3 pl-4 pr-3 text-sm">
                      <div className="font-medium text-gray-900">{name}</div>
                      {email && (
                        <div className="text-gray-500 text-xs">{email}</div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-sm">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border border-transparent",
                          roleBadgeStyles[roleName] ??
                            "bg-gray-100 text-gray-800",
                        )}
                      >
                        {roleName}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-500">
                      {entry.createdAt
                        ? new Date(entry.createdAt).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="relative whitespace-nowrap py-3 pl-3 pr-4 text-right text-sm">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleRemoveUser(entry._id, email)}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50"
                          title="Remove User"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
