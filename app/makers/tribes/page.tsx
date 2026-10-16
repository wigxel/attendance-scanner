import { heading } from "@/app/font";
import { TribesDetail } from "@/components/makers/tribes";
import { cn } from "@/lib/utils";

// /makers/tribes — the verification path behind the landing teaser:
// PRD sub-blocks 3.3–3.7. Reached by "How verification works" in section 3.
export default function MakerTribesPage() {
  return (
    <section
      id="tribes"
      className="scroll-mt-16 border-t border-(--border) px-4 py-16 md:py-28"
    >
      <div className="container mx-auto">
        <h2
          className={cn(
            heading.className,
            "tracking-tighter text-3xl md:text-5xl",
          )}
        >
          Tribes
        </h2>
        <div className="mt-16">
          <TribesDetail />
        </div>
      </div>
    </section>
  );
}
