import { heading } from "@/app/font";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { InSpaceLogoAnimation } from "./inspace-logo-animation";
import { Gutter } from "../layout/gutter";


const SITEMAP = [
  {
    heading: "The community",
    links: [
      ["Home", "/makers"],
      ["Tribes", "/makers#tribes"],
      ["Community Leaders", "/makers#leaders"],
    ],
  },
  {
    heading: "For organisations",
    links: [["Build with Inspace Makers", "/makers/build"]],
  },
  {
    heading: "The record",
    links: [
      ["What we shipped", "/makers#blog"],
      ["Weekly logs", "/makers/logs"],
    ],
  },
] as const;

export function MakersFooter() {
  return (
    <>
      <footer id="contact" className="scroll-mt-16 border-t border-border">
        <div className="container mx-auto flex flex-col gap-12 px-4 py-16 md:py-24">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <p
              className={cn(
                heading.className,
                "max-w-[22ch] tracking-tight text-3xl text-pretty md:text-5xl",
              )}
            >
              We are stronger together
            </p>
            <div className="flex flex-col gap-3 sm:flex-row md:ml-auto">
              <Button asChild size="lg">
                <a href="mailto:business@inspace.ng?subject=Membership%20application">
                  Apply to join
                </a>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="mailto:business@inspace.ng?subject=Build%20team%20enquiry">
                  Hire a build team
                </a>
              </Button>
            </div>
          </div>

          {/* standard-footer sitemap: every makers route, reachable from here */}
          <nav
            aria-label="Sitemap"
            className="grid gap-8 border-t border-border pt-12 sm:grid-cols-3"
          >
            {SITEMAP.map((group) => (
              <div key={group.heading} className="flex flex-col gap-3">
                <p className="font-mono text-xs text-muted-foreground">
                  {group.heading}
                </p>
                <ul className="flex flex-col gap-2 text-sm">
                  {group.links.map(([label, href]) => (
                    <li key={href}>
                      <a
                        href={href}
                        className="underline-offset-4 hover:underline"
                      >
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          <div className="flex flex-col gap-2 font-mono text-xs text-muted-foreground sm:flex-row sm:justify-between">
            <span>
              Inspace Makers ·{" "}
              <a
                href="mailto:business@inspace.ng"
                className="underline underline-offset-4 hover:text-foreground"
              >
                business@inspace.ng
              </a>
            </span>
            <span>© {new Date().getFullYear()}</span>
          </div>

        </div>

        <div className="container mx-auto px-4">
          <InSpaceLogoAnimation />
        </div>
      </footer>

      <Gutter
        breakpoints={[
          {
            type: 'stretch',
            columns: 12,
            gutter: 20,
            margin: 0,
            maxWidth: 1536,
          },
        ]}
      />
    </>
  );
}
