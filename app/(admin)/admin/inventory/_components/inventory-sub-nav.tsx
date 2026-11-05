"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { name: "Catalogue", href: "/admin/inventory/products" },
  { name: "Units", href: "/admin/inventory/units" },
];

export function InventorySubNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-2 border-b" aria-label="Inventory sections">
      {tabs.map((tab) => (
        <Link
          key={tab.name}
          href={tab.href}
          className={cn(
            "px-3 py-2 text-sm font-medium transition-colors",
            pathname.startsWith(tab.href)
              ? "border-b-2 border-foreground text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.name}
        </Link>
      ))}
    </nav>
  );
}
