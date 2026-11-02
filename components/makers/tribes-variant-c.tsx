import { heading } from "@/app/font";
import { cn } from "@/lib/utils";
import { TRIBES, TribesCloser, TribesIntro } from "./tribes";

// Tribe section layout variant C — "the index": editorial contents-page.
// Large serif tribe names in the left column, their lines baseline-aligned
// in the right, hairlines between rows, no numbers — the type is the
// structure. The open slot is the dashed row in the same type scale.
// Swapped in via app/makers/page.tsx.
export function TribesSection() {
  return (
    <div className="flex flex-col gap-16">
      <TribesIntro />

      <ul className="flex flex-col">
        {TRIBES.map((tribe) => (
          <li
            key={tribe.id}
            id={tribe.id}
            className="grid scroll-mt-24 items-baseline gap-x-8 gap-y-1 border-t border-(--border) py-7 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
          >
            <p
              className={cn(
                heading.className,
                "text-4xl tracking-tighter text-pretty md:text-5xl",
              )}
            >
              {tribe.name}
            </p>
            <p className="text-sm font-normal text-pretty text-muted-foreground">
              {tribe.description}
            </p>
          </li>
        ))}

        {/* open slot: an attitude claim, not a tribe — mailto until the
            batch E/F contact form replaces it */}
        <li className="contents">
          <a
            href="mailto:business@inspace.ng?subject=I%20would%20like%20to%20start%20and%20lead%20a%20tribe"
            className="grid items-baseline gap-x-8 gap-y-1 border-y border-dashed border-(--border) py-7 hover:border-foreground md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
          >
            <p
              className={cn(
                heading.className,
                "text-4xl tracking-tighter text-pretty md:text-5xl",
              )}
            >
              We have room for more.
            </p>
            <p className="text-sm font-normal text-pretty text-muted-foreground">
              Propose a tribe
            </p>
          </a>
        </li>
      </ul>

      <TribesCloser />
    </div>
  );
}
