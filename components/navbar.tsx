"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

const navItems = [
  { name: "Dashboard", href: "/admin/dashboard" },
  { name: "Customers", href: "/admin/customers" },
  { name: "Settings", href: "/admin/settings" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="w-full border-b bg-white dark:bg-black">
      <div className="mx-auto flex h-14 container items-center">
        <div className="flex flex-1 gap-2">
          <div className="flex gap-4">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-gray-100 dark:bg-gray-800 text-black dark:text-white"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 hover:text-black dark:hover:text-white"
                  }`}
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
