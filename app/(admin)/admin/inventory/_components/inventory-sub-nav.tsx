"use client";

import {
  Boxes,
  ChartNoAxesCombined,
  Package,
  ReceiptText,
  Ruler,
  ShoppingCart,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { name: "Sales", href: "/admin/inventory/sales", icon: ShoppingCart },
  {
    name: "Metrics",
    href: "/admin/inventory/metrics",
    icon: ChartNoAxesCombined,
    manageOnly: true,
  },
  {
    name: "Catalogue",
    href: "/admin/inventory/products",
    icon: Package,
    manageOnly: true,
  },
  {
    name: "Stock",
    href: "/admin/inventory/stock",
    icon: Boxes,
    manageOnly: true,
  },
  {
    name: "Purchases",
    href: "/admin/inventory/purchases",
    icon: ReceiptText,
    manageOnly: true,
  },
  {
    name: "Suppliers",
    href: "/admin/inventory/suppliers",
    icon: Truck,
    manageOnly: true,
  },
  {
    name: "Units",
    href: "/admin/inventory/units",
    icon: Ruler,
    manageOnly: true,
  },
];

export function InventorySubNav({ canManage }: { canManage: boolean }) {
  const pathname = usePathname();
  const visibleTabs = canManage ? tabs : tabs.filter((tab) => !tab.manageOnly);

  return (
    <nav className="flex flex-col gap-2" aria-label="Inventory sections">
      {visibleTabs.map((tab) => {
        const isActive = pathname.startsWith(tab.href);
        const Icon = tab.icon;

        return (
          <Link
            key={tab.name}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex w-full items-center justify-start gap-4 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {tab.name}
          </Link>
        );
      })}
    </nav>
  );
}
