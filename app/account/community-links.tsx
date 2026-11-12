"use client";

import { motion } from "motion/react";
import Image from "next/image";
import posthog from "posthog-js";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

type Channel = "makers" | "lounge" | "instagram";

type CommunityCard = {
  channel: Channel;
  title: string;
  copy: string;
  image: string;
};

const CARDS: CommunityCard[] = [
  {
    channel: "makers",
    title: "InSpace Makers",
    copy: "Get Inspired by Makers around you and get the chance to inspire others.",
    image: "/images/community-makers.webp",
  },
  {
    channel: "lounge",
    title: "InSpace Lounge",
    copy: "Stay up to date with the latest updates in the inSpace community.",
    image: "/images/community-lounge.webp",
  },
  {
    channel: "instagram",
    title: "InSpace on Instagram",
    copy: "Get to know more about InSpace and the change we want to introduce.",
    image: "/images/community-instagram.webp",
  },
];

/**
 * One community card. The whole card is a single external link, and the
 * graphic floats over a tinted stage until the image file exists.
 */
function CardLink({ channel, title, copy, image }: CommunityCard) {
  const [imageMissing, setImageMissing] = useState(false);

  return (
    <a
      href={`/shortlinks/${channel}`}
      target="_blank"
      rel="noopener noreferrer"
      className="block w-[85%] shrink-0 snap-center"
      onClick={() => posthog.capture("community_card_clicked", { channel })}
    >
      <Card className="h-full gap-0 overflow-hidden">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-b from-primary/10 via-background to-(--background-lv1)">
          <motion.div
            className="absolute inset-0 flex items-end justify-center"
            whileHover={{ y: -8, scale: 1.04 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
          >
            <motion.div
              className="relative h-full w-full origin-bottom"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              {!imageMissing && (
                <Image
                  src={image}
                  alt=""
                  fill
                  sizes="(max-width: 32rem) 85vw, 24rem"
                  className="object-contain p-4"
                  onError={() => setImageMissing(true)}
                />
              )}
            </motion.div>
          </motion.div>
        </div>

        <CardContent className="flex flex-col gap-1 px-4 py-4">
          <span className="font-semibold">{title}</span>
          <span className="text-sm text-muted-foreground">{copy}</span>
        </CardContent>
      </Card>
    </a>
  );
}

/**
 * Swipeable funnel to the InSpace community groups. Native CSS snap: the
 * next card peeks at the edge as the swipe affordance.
 */
export function CommunityLinks() {
  return (
    <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {CARDS.map((card) => (
        <CardLink key={card.channel} {...card} />
      ))}
    </div>
  );
}
