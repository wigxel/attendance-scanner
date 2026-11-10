import Image from "next/image";
import { heading } from "@/app/font";
import { cn } from "@/lib/utils";
import { TRIBES, TribesCloser, TribesIntro } from "./tribes";

// Tribe section layout variant B — "the ledger": full-width register rows,
// one rule per tribe. Logo left, serif name with its line stacked under,
// mono index at the right edge. The open slot is a dashed row with a "+"
// mark where the other rows carry a logo. Swapped in via app/makers/page.tsx.
export function TribesSection() {
  return (
    <div className="flex flex-col gap-16">
      <TribesIntro />

      <ul className="flex flex-col border-b border-(--border)">
        {TRIBES.map((tribe, i) => (
          <li
            key={tribe.id}
            id={tribe.id}
            className="grid scroll-mt-24 grid-cols-[auto_1fr_auto] items-center gap-x-6 border-t border-(--border) py-6"
          >
            {/* placeholder logos live in public/images/tribes/<id>.svg —
                drop the real logo at the same path, no code change */}
            <Image
              src={`/images/tribes/${tribe.id}.svg`}
              alt=""
              width={40}
              height={40}
              className="size-10 rounded-none md:size-12"
            />
            <div className="flex flex-col gap-1">
              <p
                className={cn(
                  heading.className,
                  "text-2xl tracking-tight text-pretty md:text-3xl",
                )}
              >
                {tribe.name}
              </p>
              <p className="text-sm font-normal text-pretty text-muted-foreground">
                {tribe.description}
              </p>
            </div>
            <span
              aria-hidden
              className="justify-self-end font-mono text-xs text-muted-foreground"
            >
              /0{i + 1}
            </span>
          </li>
        ))}

        {/* open slot: an attitude claim, not a tribe — mailto until the
            batch E/F contact form replaces it */}
        <li className="contents">
          <a
            href="mailto:business@inspace.ng?subject=I%20would%20like%20to%20start%20and%20lead%20a%20tribe"
            className="grid grid-cols-[auto_1fr_auto] items-center gap-x-6 border-y border-dashed border-(--border) py-6 hover:border-foreground hover:bg-(--background-lv1)"
          >
            <span
              aria-hidden
              className="flex size-10 items-center justify-center font-mono text-xl text-muted-foreground md:size-12"
            >
              +
            </span>
            <div className="flex flex-col gap-1">
              <p
                className={cn(
                  heading.className,
                  "text-2xl tracking-tight text-pretty md:text-3xl",
                )}
              >
                We have room for more.
              </p>
              <p className="text-sm font-normal text-pretty text-muted-foreground">
                Propose a tribe
              </p>
            </div>
            {/* the index column stays empty — no /06 on an open slot */}
            <span
              aria-hidden
              className="font-mono text-xs text-muted-foreground"
            />
          </a>
        </li>
      </ul>

      <TribesCloser />
    </div>
  );
}
