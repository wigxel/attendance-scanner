"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Dashboard", href: "/admin/dashboard" },
  { name: "Reservations", href: "/admin/reservations" },
  { name: "Customers", href: "/admin/customers" },
  { name: "Settings", href: "/admin/settings" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="w-full border-b bg-background">
      <div className="mx-auto flex h-14 container items-center">
        <div className="flex flex-1 gap-2">
          <div className="flex gap-4">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-foreground/5 text-foreground"
                      : "text-muted-foreground hover:bg-background hover:text-foreground dark:hover:text-foreground",
                  )}
                >
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
