import { heading } from "@/app/font";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Makers footer — PRD: housekeeping and a last call to action, with both
// audiences' asks ("Apply to join"; "Hire a build team"). Replaces the app
// Footer on makers routes (app/makers/layout.tsx): the shared footer speaks
// for the product, not the community page. Both buttons are mailto until
// batch F ships the form modals — same precedent as the build-team enquiry.
// id="contact" is the target every ApplyLink scrolls to.
export function MakersFooter() {
  return (
    <footer id="contact" className="scroll-mt-16 border-t border-(--border)">
      <div className="container mx-auto flex flex-col gap-12 px-4 py-16 md:py-24">
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <p
            className={cn(
              heading.className,
              "max-w-[22ch] tracking-tight text-3xl text-pretty md:text-5xl",
            )}
          >
            Start with a visit.
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
    </footer>
  );
}
