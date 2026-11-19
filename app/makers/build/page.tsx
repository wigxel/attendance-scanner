import { BuildDetail } from "@/components/makers/build";

// /makers/build — the client-facing page behind the landing teaser:
// PRD sub-blocks 5.1–5.7 for the clients audience, on the block grid
// (1 margin field + 5 content fields). Reached from #build on the
// landing; hero "Hire a build team" still scrolls there first.
export default function MakersBuildPage() {
  return (
    <section
      id="build"
      className="border-t border-(--border) px-4 py-16 md:py-28"
    >
      <div className="container mx-auto">
        <div className="mt-10">
          <BuildDetail />
        </div>
      </div>
    </section>
  );
}
