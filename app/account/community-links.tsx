"use client";

import { ArrowUpRightIcon } from "lucide-react";
import Image from "next/image";
import posthog from "posthog-js";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Channel = "makers" | "lounge" | "instagram";

type CommunityCard = {
  url?: string;
  channel: Channel;
  title: string;
  copy: string;
  image: string;
  ctaCopy: string;
};

const CARDS: CommunityCard[] = [
  {
    channel: "makers",
    title: "InSpace Makers",
    copy: "Get Inspired by Makers around you and get the chance to inspire others.",
    image: "/images/community-makers.webp",
    url: "/makers",
    ctaCopy: "Learn more",
  },
  {
    channel: "lounge",
    title: "InSpace Lounge",
    copy: "Stay up to date with the latest updates in the inSpace community.",
    image: "/images/community-loung.webp",
    ctaCopy: "Join the club",
  },
  {
    channel: "instagram",
    title: "InSpace on Instagram",
    copy: "Get to know InSpace and the shift we’re bringing to your craft.",
    image: "/images/community-instagram.webp",
    ctaCopy: "Keep me up to date",
  },
];

/**
 * One community card. The whole card is a single external link, and the
 * graphic floats over a tinted stage until the image file exists.
 */
function CardLink({
  channel,
  title,
  copy,
  url,
  image,
  ctaCopy,
}: CommunityCard) {
  const [imageMissing, setImageMissing] = useState(false);

  return (
    <Card className="w-full max-w-sm shrink-0 snap-center gap-0 overflow-hidden">
      <div className="relative aspect-4/2 w-full overflow-hidden bg-linear-to-b from-primary/10 via-background to-background-lv1">
        {!imageMissing && (
          <Image
            fill
            src={image}
            alt={`A photo of ${title}`}
            className="object-cover"
            onError={() => setImageMissing(true)}
          />
        )}
      </div>

      <CardContent className="flex flex-col gap-1 px-4 py-4">
        <span className="font-semibold">{title}</span>
        <span className="text-sm text-muted-foreground">{copy}</span>

        <Button
          asChild
          className="mt-4 justify-between px-0! hover:px-4! focus:px-4!"
          variant="ghost"
        >
          <a
            href={url ?? `/shortlinks/${channel}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() =>
              posthog.capture("community_card_clicked", { channel })
            }
          >
            {ctaCopy}
            <ArrowUpRightIcon strokeWidth={1} />
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * Swipeable funnel to the InSpace community groups. Native CSS snap: the
 * next card peeks at the edge as the swipe affordance.
 */
export function CommunityLinks() {
  return (
    <div className="py-4">
      <h3 className="text-lg font-medium mb-4 pl-1">Join the community</h3>
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 scrollbar-none [&::-webkit-scrollbar]:hidden">
        {CARDS.map((card) => (
          <CardLink key={card.channel} {...card} />
        ))}
      </div>
    </div>
  );
}
