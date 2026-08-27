"use client";
import { Menu } from "lucide-react";
import {
  MobileMenuContent,
  MobileMenuTrigger,
  useMobileMenu,
} from "@/components/mobile-menu";
import { cn } from "@/lib/utils";

type Props = { children: React.ReactNode }

export function MobileNav({ children }: Props) {
  const { open } = useMobileMenu();

  return (
    <>
      <MobileMenuTrigger
        className={cn("transition-default fixed top-4 z-[10000] end-4", {
          "top-6 right-6": open,
        })}
      >
        <Menu />
      </MobileMenuTrigger>

      <MobileMenuContent innerClassName="bg-background text-foreground">
        {children}
      </MobileMenuContent>
    </>
  );
}
