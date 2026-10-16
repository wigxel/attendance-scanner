"use client";

import { Menu } from "lucide-react";
import { useEffect, useState } from "react";
import {
  MobileMenu,
  MobileMenuContent,
  MobileMenuTrigger,
  useMobileMenu,
} from "@/components/mobile-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Nav links map one-to-one to page sections (PRD architecture table).
// resourcesHidden tracks the PRD rule: fewer than three real artefacts →
// the link is dropped, not rendered dead.
// anchors are absolute: makers routes (/makers, /makers/tribes) both land
// on the landing page sections
const NAV_LINKS = [
  { id: "tribes", label: "Tribes" },
  { id: "build", label: "Build with Inspace Makers" },
  { id: "resources", label: "Resources" },
  { id: "leaders", label: "Community Leaders" },
] as const;

const RESOURCES_HIDDEN = true; // ponytail: batch D computes from real artefact count

const SECTION_IDS = ["top", ...NAV_LINKS.map((link) => link.id)] as const;

export function MakersNav() {
  const [current, setCurrent] = useState<string>("top");
  const [scrolled, setScrolled] = useState(false);

  const links = NAV_LINKS.filter(
    (link) => !(link.id === "resources" && RESOURCES_HIDDEN),
  );

  useEffect(() => {
    const visible = SECTION_IDS.filter(
      (id) => !(id === "resources" && RESOURCES_HIDDEN),
    );

    const observers = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setCurrent(entry.target.id);
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );

    for (const id of visible) {
      const element = document.getElementById(id);
      if (element) observers.observe(element);
    }
    return () => observers.disconnect();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <MobileMenu>
      <header
        className={cn(
          "sticky top-0 z-40 bg-background",
          scrolled && "border-b border-(--border)",
        )}
      >
        <nav
          aria-label="Inspace Makers"
          className="container mx-auto flex h-16 items-center justify-between gap-2 px-4"
        >
          <a href="#content" className="font-bold">
            Inspace Makers
          </a>
          <div className="hidden items-center gap-8 font-mono text-sm lg:flex">
            {links.map((link) => (
              <a
                key={link.id}
                href={`/#${link.id}`}
                aria-current={current === link.id ? "true" : undefined}
                className={cn(
                  "text-muted-foreground hover:text-foreground",
                  current === link.id && "text-foreground underline",
                )}
              >
                {link.label}
              </a>
            ))}
          </div>
          {/* mr on mobile leaves room for the floating menu trigger */}
          <Button asChild variant="outline" className="mr-11 lg:mr-0">
            <a href="#tribes">Apply to join</a>
          </Button>
        </nav>
      </header>

      {/* established mobile menu idiom: floating trigger + portal sheet
          (components/mobile-menu.tsx owns trap/escape/scroll-lock) */}
      <MobileMenuTrigger className="transition-default fixed top-3 end-3.5 z-[10000] p-2">
        <Menu className="size-5" aria-hidden />
        <span className="sr-only">Menu</span>
      </MobileMenuTrigger>

      <MobileMenuContent innerClassName="bg-background text-foreground">
        <MakersMenuLinks links={links} />
      </MobileMenuContent>
    </MobileMenu>
  );
}

// current is implicit: whatever the URL hash says
function useCurrentHashId(): string {
  const [hashId, setHashId] = useState(() =>
    typeof window !== "undefined" ? window.location.hash.slice(1) : "",
  );

  useEffect(() => {
    const onHash = () => setHashId(window.location.hash.slice(1));
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return hashId;
}

// anchor links close the sheet — the target section must be visible
function MakersMenuLinks({
  links,
}: {
  links: ReadonlyArray<{ id: string; label: string }>;
}) {
  const { setOpen } = useMobileMenu();
  const current = useCurrentHashId();

  return (
    <ul className="flex flex-1 flex-col justify-center divide-y divide-(--border) px-4 pb-32">
      {links.map((link) => (
        <li key={link.id}>
          <a
            href={`/#${link.id}`}
            aria-current={current === link.id ? "true" : undefined}
            className={cn(
              "flex items-center py-4 font-mono text-muted-foreground hover:text-foreground",
              current === link.id && "text-foreground underline",
            )}
            onClick={() => setOpen(false)}
          >
            {link.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
