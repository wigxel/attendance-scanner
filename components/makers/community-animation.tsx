"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const allTribes = [
  { imageUrl: "/images/tribes/tribe-design.svg", label: "Design" },
  {
    imageUrl: "/images/tribes/tribe-ml-ai.svg",
    label: "AI/ML",
    className: "scale-[1.3]",
  },
  {
    imageUrl: "/images/tribes/tribe-additive-manufacturing.svg",
    label: "Additive Manufacturing",
    className: "scale-[0.86]",
  },
  {
    imageUrl: "/images/tribes/tribe-gaming.svg",
    label: "Gaming",
    className: "rotate-45 scale-[1.3]",
  },
  { imageUrl: "/images/tribes/tribe-blockchain.svg", label: "Blockchain" },
  {
    imageUrl: "/images/tribes/tribe-web-dev.svg",
    label: "Web Development",
    className: "scale-[1.2]",
  },
];

// the grid is 2x2, so only four symbols show per round
const VISIBLE = 4;

// must match the `tribe-pop` cycle in app/makers/maker.css
const CYCLE_MS = 6000;

function shuffle<T>(items: readonly T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function pickTiles() {
  return shuffle(allTribes).slice(0, VISIBLE);
}

export function CommunityAnimation() {
  const [round, setRound] = useState({
    count: 0,
    tiles: allTribes.slice(0, VISIBLE),
  });

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = setInterval(
      () =>
        setRound((current) => ({
          count: current.count + 1,
          tiles: pickTiles(),
        })),
      CYCLE_MS,
    );

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex min-w-55 basis-3/12 flex-col justify-center gap-8">
      <div className="grid gap-12 grid-cols-2 grid-rows-2 origin-center rotate-45 animate-spin animate animation-duration-[180s]">
        {round.tiles.map((tribe, index) => (
          <div
            key={`${round.count}-${tribe.imageUrl}`}
            className="tribe-pop"
            style={{ animationDelay: `${index * 0.18}s` }}
          >
            <Image
              src={tribe.imageUrl}
              width={60}
              height={60}
              priority
              className={cn(
                "object-fit aspect-square w-full backface-visible",
                tribe.className,
              )}
              alt=""
            />
          </div>
        ))}
      </div>
    </div>
  );
}
