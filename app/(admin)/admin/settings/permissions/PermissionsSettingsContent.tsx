"use client";

import { useQuery } from "convex/react";
import { KeyRound, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { DeletePermissionDialog } from "@/components/admin/dialogs/DeletePermissionDialog";
import { PermissionFormDialog } from "@/components/admin/dialogs/PermissionFormDialog";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/components/acl/_generated/dataModel";

type Permission = Doc<"permissions">;

export function PermissionsSettingsContent() {
  const permissions = useQuery(api.permissions.listPermissions);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [permissionToDelete, setPermissionToDelete] = useState<{
    _id: string;
    name: string;
  } | null>(null);

  const handleEdit = (perm: Permission) => {
    setSelectedPermission(perm);
    setIsFormOpen(true);
  };

  const handleDelete = (perm: { _id: string; name: string }) => {
    setPermissionToDelete(perm);
    setIsDeleteDialogOpen(true);
  };

  const grouped: Record<string, Permission[]> =
    permissions?.reduce(
      (acc: Record<string, Permission[]>, perm: Permission) => {
        const cat = (perm as Permission).category;
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(perm as Permission);
        return acc;
      },
      {} as Record<string, Permission[]>,
    ) ?? {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-gray-400" />
            Permissions
          </h2>
        </div>

        <Button
          onClick={() => {
            setSelectedPermission(null);
            setIsFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Add Permission
        </Button>
      </div>


      <p className="mt-1 text-sm text-gray-500 text-pretty">
        Manage permission keys and their descriptions. Permissions are
        grouped by category and assigned to roles.
      </p>

      {permissions === undefined ? (
        <div className="flex justify-center p-8">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          No permissions found.
        </div>
      ) : (
        (Object.entries(grouped) as [string, Permission[]][]).map(([category, perms]) => (
          <div key={category} className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider px-1">
              {category}
            </h3>
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {perms.map((perm) => (
                    <tr
                      key={perm._id}
                      className="hover:bg-gray-50 transition-colors group"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <code className="text-sm font-mono text-gray-900">
                          {perm.name}
                        </code>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500 max-w-xs truncate">
                          {perm.description}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(perm)}
                            className="h-8 w-8 text-gray-400 hover:text-gray-900 hover:bg-gray-100"
                            title="Edit Permission"
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(perm)}
                            className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
                            title="Delete Permission"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      <PermissionFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        permission={selectedPermission}
      />

      <DeletePermissionDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        permissionId={permissionToDelete?._id || null}
        permissionName={permissionToDelete?.name || null}
      />
    </div>
  );
}
