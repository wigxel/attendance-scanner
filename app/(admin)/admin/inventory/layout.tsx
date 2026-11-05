import { RoleHas } from "@/components/RoleHas";
import { InventorySubNav } from "./_components/inventory-sub-nav";

export default function InventoryLayout(props: { children: React.ReactNode }) {
  return (
    <RoleHas privileges={["inventory:manage"]}>
      <div className="py-6">
        <InventorySubNav />
        {props.children}
      </div>
    </RoleHas>
  );
}
