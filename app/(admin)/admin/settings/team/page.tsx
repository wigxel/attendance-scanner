import { RoleHas } from "@/components/RoleHas";
import { AdminUsersTable } from "@/components/admin/dialogs/AdminUsersTable";

export default function TeamSettingsPage() {
  return (
    <RoleHas privileges={["user:assign:role"]}>
      <AdminUsersTable />
    </RoleHas>
  );
}
