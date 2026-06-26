"use client";

import { useQuery } from "convex/react";
import { Pencil, Plus, Shield, Trash2 } from "lucide-react";
import { useState } from "react";
import { DeleteRoleDialog } from "@/components/admin/dialogs/DeleteRoleDialog";
import { RoleFormDialog } from "@/components/admin/dialogs/RoleFormDialog";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { ACLRole } from "@/convex/components/acl/interfaces";

export function RolesSettingsContent() {
  const roles: ACLRole[] | undefined = useQuery(api.acl.getRoles);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<{
    _id: string;
    name: string;
    description: string;
    privileges: string[];
  } | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<{
    _id: string;
    name: string;
  } | null>(null);

  const handleEdit = (role: ACLRole) => {
    setSelectedRole({
      _id: role._id,
      name: role.name,
      description: role.description,
      privileges: role.privileges,
    });
    setIsFormOpen(true);
  };

  const handleDelete = (role: ACLRole) => {
    setRoleToDelete({
      _id: role._id,
      name: role.name,
    });
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-foreground flex items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            Roles & Privileges
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage custom roles and assign privileges to control what users can
            do in the application.
          </p>
        </div>

        <Button
          onClick={() => {
            setSelectedRole(null);
            setIsFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Create Role
        </Button>
      </div>

      <div className="rounded-lg border border-(--border) bg-background shadow-sm overflow-hidden">
        {roles === undefined ? (
          <div className="flex justify-center p-8">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          </div>
        ) : roles.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No roles found.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-(--border)">
            <thead className="bg-background">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Privileges
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-background divide-y divide-(--border)">
              {roles.map((role) => (
                <tr
                  key={role._id}
                  className="hover:bg-background transition-colors group"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-foreground">
                      {role.name}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-muted-foreground max-w-xs truncate">
                      {role.description}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {(role.privileges as string[]).slice(0, 3).map((p) => (
                        <span
                          key={p}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                        >
                          {p.split(":").pop() || p}
                        </span>
                      ))}
                      {role.privileges.length > 3 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-muted-foreground">
                          +{role.privileges.length - 3} more
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(role)}
                        className="h-8 w-8 text-gray-400 hover:text-foreground hover:bg-gray-100"
                        title="Edit Role"
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      {role.name !== "admin" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(role)}
                          className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
                          title="Delete Role"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <RoleFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        role={selectedRole}
      />

      <DeleteRoleDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        roleId={roleToDelete?._id || null}
        roleName={roleToDelete?.name || null}
      />
    </div>
  );
}
