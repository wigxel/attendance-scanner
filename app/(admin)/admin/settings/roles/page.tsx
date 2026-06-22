import { RoleHas } from "@/components/RoleHas";
import { RolesSettingsContent } from "./RolesSettingsContent";

export default function RolesSettingsPage() {
  return (
    <RoleHas privileges={["user:assign:role"]}>
      <RolesSettingsContent />
    </RoleHas>
  );
}
