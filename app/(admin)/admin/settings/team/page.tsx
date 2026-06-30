import { AdminUsersTable } from "@/components/admin/dialogs/AdminUsersTable";
import { RoleHas } from "@/components/RoleHas";

export default function TeamSettingsPage() {
  return (
    <RoleHas privileges={["user:assign:role"]}>
      <AdminUsersTable />
    </RoleHas>
  );
}
