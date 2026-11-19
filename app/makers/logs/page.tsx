import { heading } from "@/app/font";
import { LogsContent } from "@/components/makers/logs";
import { cn } from "@/lib/utils";

// /makers/logs — weekly logs, one page grouped by tribe: what each tribe
// shipped that week and who was active. Reached from the footer and the
// "What we shipped" section.
export default function MakersLogsPage() {
  return (
    <section id="logs" className="scroll-mt-16 px-4 py-16 md:py-28">
      <div className="container mx-auto">
        <div className="flex flex-col gap-8 gap-4">
          <h2
            className={cn(
              heading.className,
              "tracking-tighter text-3xl md:text-5xl",
            )}
          >
            Weekly logs
          </h2>

          <div className="mb-2 flex text-pretty flex-1">
            <p className="max-w-[40ch] text-sm text-muted-foreground">
              Each week, every tribe records what moved forward: one row per
              entry, with a short summary of the work and who showed up to do
              it.
            </p>
          </div>
        </div>

        <div className="mt-16 max-w-[70ch] md:max-w-none">
          <LogsContent />
        </div>
      </div>
    </section>
  );
}
