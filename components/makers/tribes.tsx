import Image from "next/image";
import { CircularButton } from "../circular-button";

export const TRIBES = [
  {
    id: "tribe-ml-ai",
    name: "ML/AI",
    fullname: "Machine learning & Artificial Intelligence",
    color: "#f59e0b",
    description:
      "Models, agents, and AI features built into projects or as standalone solutions.",
  },
  {
    id: "tribe-additive-manufacturing",
    name: "Manufacturing",
    fullname: "Manufacturing ",
    color: "#8b5cf6",
    description:
      "Printed parts, enclosures, and hardware prototypes for real use, not just display.",
  },
  {
    id: "tribe-web-dev",
    name: "Software",
    fullname: "Software Development",
    color: "#0ea5e9",
    description:
      "Websites and tools for the community, plus client work that funds operations.",
  },
  {
    id: "tribe-gaming",
    name: "Gaming",
    fullname: "Game development",
    color: "#ec4899",
    description:
      "Small games from jams and build nights, shipped and enjoyed, not shelved.",
  },
  {
    id: "tribe-blockchain",
    name: "Blockchain",
    fullname: "Web3/Blockchain",
    color: "#10b981",
    description:
      "Contracts and integrations, deployed where blockchain genuinely adds value and utility.",
  },
  {
    id: "tribe-design",
    name: "Design",
    fullname: "Visual Design",
    color: "#ef4444",
    description:
      "Identity, interface, and print design, making the community's work clear and engaging.",
  },
  {
    id: "tribe-qa",
    name: "QA",
    fullname: "Quality Assurance",
    color: "#ff44f4",
    description:
      "Testing and validation to ensure project quality and reliability, catching issues before shipping.",
  },
] as const;

type Tribe = (typeof TRIBES)[number];

export function TribesIntro() {
  return (
    <div className="flex *:flex-1 gap-5">
      <h2 className="font-heading text-6xl sticky top-0 font-black">Tribes</h2>
      <p className="max-w-[45ch] text-3xl font-thin text-muted-foreground">
        A tribe is a group of members who meet to build, show and check work
        against a shared standard. Pick yours and start with a visit.
      </p>
    </div>
  );
}

type TribeItemProps = {
  tribe: Tribe;
  index: number;
};

function TribeItem({ tribe, index }: TribeItemProps) {
  return (
    <li
      id={tribe.id}
      className="relative flex group scanline-container aspect-square overflow-clip after:z-1! scroll-mt-24 flex-col p-6 md:p-8"
    >
      <Image
        src={`/images/tribes/${tribe.id}.svg`}
        alt={`${tribe.name} Logo`}
        width={40}
        height={40}
        className="size-10 rounded-none md:size-12"
      />

      <Image
        src={`/images/tribes/${tribe.id}.svg`}
        alt={`${tribe.name} Logo`}
        width={120}
        height={120}
        className="size-200 absolute bottom-0 rotate-45 scale-[5] animate-spin animation-duration-[20s] blur-lg opacity-10 group-hover:opacity-20 group-hover:scale-[10] transition-default will-change-transform group-hover:rotate-0 right-0 translate-x-1/2  rounded-none md:size-12"
      />

      <p
        className={
          "font-heading mt-auto text-2xl tracking-tight text-pretty md:text-3xl font-thin"
        }
      >
        {tribe.name}
      </p>

      <p className="mt-2 text-lg font-thin line-clamp-2 text-pretty text-muted-foreground">
        {tribe.description}
      </p>

      <span
        aria-hidden
        className="absolute top-6 right-6 font-mono text-xs md:top-8 md:right-8"
      >
        /0{index + 1}
      </span>
    </li>
  );
}

export function TribesSection() {
  return (
    <section className="py-32 bg-background">
      <div className="flex flex-col container mx-auto px-4">
        <div className="grid grid-cols-3 gap-5">
          <div>
            <h2 className="font-heading text-6xl sticky top-(--sticky-top) font-black">
              Tribes
            </h2>
          </div>

          <ul className="col-span-2 grid gap-4 sm:grid-cols-2">
            <div className="col-span-2 grid gap-5 pb-16 grid-cols-4">
              <div className="col-span-1" />
              <p className="max-w-[45ch] text-3xl col-span-3 font-thin text-muted-foreground">
                A tribe is a group of members who meet to build, show and check
                work against a shared standard. Pick yours and start with a
                visit.
              </p>
            </div>

            {TRIBES.map((tribe, i) => (
              <TribeItem key={tribe.id} tribe={tribe} index={i} />
            ))}

            <li className="contents">
              <a
                href="mailto:business@inspace.ng?subject=I%20would%20like%20to%20start%20and%20lead%20a%20tribe"
                className="flex aspect-square flex-col border border-dashed border-border p-6 hover:border-foreground hover:bg-background-lv1 md:p-8"
              >
                <p
                  className={
                    "mt-auto text-2xl tracking-tight text-pretty md:text-3xl"
                  }
                >
                  There&apos;s room for more
                </p>
                <p className="mt-2 font-thin text-lg text-pretty line-clamp-2 text-muted-foreground">
                  Propose a new tribe for your niche interest if you have a
                  vision and want to lead a group.
                </p>
              </a>
            </li>
          </ul>
        </div>

        <div className="grid grid-cols-6 -translate-y-1/2">
          <div className="col-span-1" />
          <div className="apply-dodge">
            <ApplyLink />
          </div>
        </div>
      </div>
    </section>
  );
}

export function ApplyLink() {
  return (
    <CircularButton text="Apply to join">
      <a href="#contact">Apply to join</a>
    </CircularButton>
  );
}
