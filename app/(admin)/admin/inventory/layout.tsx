import { currentUser } from "@clerk/nextjs/server";
import { RoleHas } from "@/components/RoleHas";
import { InventorySubNav } from "./_components/inventory-sub-nav";

const MANAGE = "inventory:manage";
const SELL = "inventory:sell";

export default async function InventoryLayout(props: {
  children: React.ReactNode;
}) {
  const user = await currentUser().catch(() => null);
  const privileges = (user?.privateMetadata?.privileges as string[]) ?? [];

  return (
    <RoleHas privileges={[MANAGE, SELL]} require="any">
      <div className="flex min-h-100 mt-8">
        <div className="flex w-full flex-col items-start gap-4 rounded-lg bg-background p-1 md:mx-auto md:flex-row">
          <aside className="w-full shrink-0 p-4 md:sticky md:top-0 md:basis-1/5">
            <InventorySubNav canManage={privileges.includes(MANAGE)} />
          </aside>

          <section className="min-w-0 flex-1 self-stretch rounded-lg bg-background-lv1 p-6 shadow-inner">
            {props.children}
          </section>
        </div>
      </div>
    </RoleHas>
  );
}
