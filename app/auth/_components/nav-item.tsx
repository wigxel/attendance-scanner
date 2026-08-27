"use client";
import type { LucideProps } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

type NavItemProps = {
  href: string;
  icon: React.ComponentType<LucideProps>;
  label: string;
  variant: "menu" | "link";
};

export function NavItem({ href, icon: Icon, label, variant }: NavItemProps) {
  const pathname = usePathname();
  const isActive = pathname.startsWith(href);

  if (variant === "menu") {
    return (
      <Link href={href}>
        <li
          className={`text-base flex gap-4 px-2 py-3 ${isActive ? "font-semibold" : ""}`}
        >
          <Icon className="opacity-75" />
          <div className="flex">{label}</div>
        </li>
      </Link>
    );
  }

  return (
    <Link href={href}>
      <Button variant={isActive ? "secondary" : "ghost"}>{label}</Button>
    </Link>
  );
}
