import Balancer from "react-wrap-balancer";

import { heading } from "@/app/font";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TRIBES } from "./tribes";

export function MakersHero() {
  return (
    <section
      id="top"
      className="container mx-auto flex flex-col gap-8 px-4 pb-24 pt-16 md:pb-36 md:pt-28"
    >
      <p className="font-mono text-sm text-muted-foreground">
        A community of verified Nigerian builders
      </p>

      <Balancer>
        <h1
          className={cn(
            heading.className,
            "max-w-[90rem] leading-[1.05] tracking-tighter text-4xl sm:text-6xl md:text-[6vw]",
          )}
        >
          Build to international standards, on Nigerian problems.
        </h1>
      </Balancer>

      {/* PRD section 2 description minus the hard count "five" (owner rule:
          counts go stale with every tribe) — re-paste on your PRD update */}
      <p className="max-w-[60ch] text-lg text-pretty text-muted-foreground">
        Inspace Makers unites Nigerian developers and Makers. Their work is
        verified against a shared standard. Real projects ship for the
        organisations that need them.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg">
          <a href="#tribes">Apply to join</a>
        </Button>
        <Button asChild variant="outline" size="lg">
          <a href="#build">Hire a build team</a>
        </Button>
      </div>

      <p className="font-mono text-sm">Free to join. Verified to build.</p>

      <ul className="flex flex-wrap gap-x-6 gap-y-2">
        {TRIBES.map((tribe) => (
          <li key={tribe.name}>
            <a
              href={`#${tribe.id}`}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <span
                aria-hidden
                className="size-2.5 rounded-full"
                style={{ backgroundColor: tribe.color }}
              />
              {tribe.name}
            </a>
          </li>
        ))}
      </ul>

      {/* meeting line renders only when an Admin sets a date (batch F) */}
    </section>
  );
}
