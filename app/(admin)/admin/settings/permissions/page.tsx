import { RoleHas } from "@/components/RoleHas";
import { PermissionsSettingsContent } from "./PermissionsSettingsContent";

export default function PermissionsSettingsPage() {
  return (
    <RoleHas privileges={["user:assign:role"]}>
      <PermissionsSettingsContent />
    </RoleHas>
  );
}
