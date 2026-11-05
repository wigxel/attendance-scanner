import { RoleHas } from "@/components/RoleHas";
import { InventorySubNav } from "./_components/inventory-sub-nav";

export default function InventoryLayout(props: { children: React.ReactNode }) {
  return (
    <RoleHas privileges={["inventory:manage"]}>
      <div className="flex min-h-100 mt-8">
        <div className="flex w-full flex-col items-start gap-4 rounded-lg bg-background p-1 md:mx-auto md:flex-row">
          <aside className="w-full shrink-0 p-4 md:sticky md:top-0 md:basis-1/5">
            <InventorySubNav />
          </aside>

          <section className="min-w-0 flex-1 self-stretch rounded-lg bg-background-lv1 p-6 shadow-inner">
            {props.children}
          </section>
        </div>
      </div>
    </RoleHas>
  );
}
