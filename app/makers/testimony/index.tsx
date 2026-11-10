"use client";
import { motion, useInView } from "motion/react";
import Image from "next/image";
import { type RefObject, useEffect, useRef, useState } from "react";
import useEvent from "react-use-event-hook";
import { heading } from "@/app/font";
import { cn } from "@/lib/utils";

const testimonies = [
  {
    name: "Anya Sharma",
    tribe: "The Innovators",
    title: "Chief Visionary Officer",
    comment: "Incredible platform for growth!",
    avatar: "/images/makers/avatars/madonna.webp",
  },
  {
    name: "Ben Carter",
    tribe: "The Strategists",
    title: "Lead Strategic Planner",
    comment:
      "The data-driven insights provided by this system are absolutely invaluable. It allows us to make informed decisions quickly and confidently, steering our projects towards success with precision. A game-changer for strategic planning.",
    avatar: "/images/makers/avatars/madonna.webp",
  },
  {
    name: "Chloe Davis",
    tribe: "The Creatives",
    title: "Artistic Director",
    comment: "Unleashed our creative potential.",
    avatar: "/images/makers/avatars/madonna.webp",
  },
  {
    name: "Daniel Evans",
    tribe: "The Engineers",
    title: "Senior Software Engineer",
    comment:
      "The seamless integration with our existing toolset and its robust performance have made our development workflow so much more efficient. It's a testament to solid engineering and thoughtful design. A must-have for any dev team.",
    avatar: "/images/makers/avatars/madonna.webp",
  },
  {
    name: "Ella Foster",
    tribe: "The Guardians",
    title: "Head of Security Operations",
    comment: "Enhanced our security posture.",
    avatar: "/images/makers/avatars/madonna.webp",
  },
  {
    name: "Frank Green",
    tribe: "The Analysts",
    title: "Chief Data Scientist",
    comment:
      "The analytical capabilities offered here are truly exceptional. We can dive deep into our data, uncover hidden patterns, and derive actionable insights that drive our business forward. An indispensable tool for any data scientist.",
    avatar: "/images/makers/avatars/madonna.webp",
  },
  {
    name: "Grace Harris",
    tribe: "The Visionaries",
    title: "Founder & CEO",
    comment: "Transformed our entire operation.",
    avatar: "/images/makers/avatars/madonna.webp",
  },
  {
    name: "Henry Isaacs",
    tribe: "The Builders",
    title: "Project Lead",
    comment:
      "As a project lead, keeping everything organized is crucial. This system has streamlined our project management, making it easier to track progress, allocate resources, and hit our deadlines consistently. A real productivity booster.",
    avatar: "/images/makers/avatars/madonna.webp",
  },
  {
    name: "Ivy Jackson",
    tribe: "The Connectors",
    title: "Community Manager",
    comment: "Fostered a thriving community.",
    avatar: "/images/makers/avatars/madonna.webp",
  },
  {
    name: "Jack King",
    tribe: "The Accelerators",
    title: "Head of Growth",
    comment:
      "Our goal is always to accelerate growth, and this solution has delivered beyond expectations. It's helped us expand our market reach, optimize our campaigns, and significantly boost our conversion rates. A true growth engine.",
    avatar: "/images/makers/avatars/madonna.webp",
  },
  {
    name: "Karen Lee",
    tribe: "The Mentors",
    title: "Senior Trainer",
    comment: "Empowered our learning journey.",
    avatar: "/images/makers/avatars/madonna.webp",
  },
];

/** Move one card; the first two children give the card width plus gap. */
function scrollCarousel(carousel: HTMLDivElement, direction: 1 | -1) {
  const [firstCard, secondCard] = Array.from(
    carousel.children,
  ) as HTMLElement[];
  const step =
    firstCard && secondCard
      ? secondCard.offsetLeft - firstCard.offsetLeft
      : (firstCard?.offsetWidth ?? carousel.clientWidth);

  carousel.scrollBy({ left: direction * step, behavior: "smooth" });
}

type TestimonyNavProps = {
  carouselRef: RefObject<HTMLDivElement | null>;
};

function TestimonyNav({ carouselRef }: TestimonyNavProps) {
  const navRef = useRef<HTMLDivElement>(null);
  const inView = useInView(navRef, { amount: 0.5 });

  const handlePrevious = useEvent(() => {
    const carousel = carouselRef.current;
    if (carousel) scrollCarousel(carousel, -1);
  });

  const handleNext = useEvent(() => {
    const carousel = carouselRef.current;
    if (carousel) scrollCarousel(carousel, 1);
  });

  // Arrow keys belong to the page until these controls are on screen.
  useEffect(() => {
    if (!inView) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

      const direction = event.key === "ArrowLeft" ? -1 : 1;
      const carousel = carouselRef.current;
      if (!carousel) return;

      event.preventDefault();
      scrollCarousel(carousel, direction);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [inView, carouselRef]);

  return (
    <div ref={navRef} className="flex gap-12 pb-5 *:opacity-50 *:hover:opacity-100 justify-start">
      <button
        type="button"
        className="focus:outline-none focus:opacity-100 focus:scale-110 hover:scale-110 transition-default"

        aria-label="Previous testimony"
        onClick={handlePrevious}
      >
        <Image
          src="/images/pixel-arrow.svg"
          alt=""
          width={20}
          className="w-12 -rotate-180 transform"
          height={10}
          priority={true}
        />
      </button>
      <button type="button"
        className="focus:outline-none focus:opacity-100 focus:scale-110 hover:scale-110 transition-default"
        aria-label="Next testimony" onClick={handleNext}>
        <Image
          src="/images/pixel-arrow.svg"
          alt=""
          width={20}
          className="w-12"
          height={10}
          priority={true}
        />
      </button>
    </div>
  );
}

export function TestimonySection() {
  const count = testimonies.length;
  const carouselRef = useRef<HTMLDivElement>(null);
  const [scroll, setScroll] = useState({ progress: 0, viewportRatio: 1 });

  // The handle width is the visible slice of the track and its travel is the
  // remaining width, so both the edges and the end scroll line up exactly.
  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const measure = () => {
      const maxScroll = carousel.scrollWidth - carousel.clientWidth;
      setScroll({
        progress: maxScroll > 0 ? carousel.scrollLeft / maxScroll : 0,
        viewportRatio:
          carousel.scrollWidth > 0
            ? Math.min(carousel.clientWidth / carousel.scrollWidth, 1)
            : 1,
      });
    };

    measure();
    carousel.addEventListener("scroll", measure, { passive: true });

    const observer = new ResizeObserver(measure);
    observer.observe(carousel);

    return () => {
      carousel.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="w-full overflow-x-clip">
      <section className="container mx-auto px-4 flex flex-col gap-24 py-32">
        <div className="flex gap-12">
          <div className="basis-1/6" />
          <div className="flex-1 basis-3/4 gap-12 flex flex-col">
            <h2
              className={cn(
                heading.className,
                "tracking-tighter text-3xl md:text-6xl",
              )}
              style={{
                fontFamily: "Safiro",
                fontWeight: 900,
                letterSpacing: 2,
              }}
            >
              THE TRIBES SPEAK
            </h2>

            <svg
              width="336"
              height="12"
              viewBox="0 0 336 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="pl-2"
            >
              <motion.path
                initial={{ strokeDasharray: 0 }}
                whileInView={{
                  strokeDasharray: 500,
                  transition: { duration: 2, delay: 1 },
                }}
                d="M0.219727 5.62939C6.00624 8.46228 4.91063 10.7588 10.6971 10.7588C16.4837 10.7588 15.388 8.46228 21.1746 5.62939C26.9611 2.79651 25.8655 0.5 31.652 0.5C37.4385 0.5 36.3429 2.79651 42.1294 5.62939C47.9159 8.46228 46.8203 10.7588 52.6068 10.7588C58.3933 10.7588 57.2977 8.46228 63.0842 5.62939C68.8707 2.79651 67.7751 0.5 73.5616 0.5C79.3482 0.5 78.2525 2.79651 84.0391 5.62939C89.8256 8.46228 88.73 10.7588 94.5165 10.7588C100.303 10.7588 99.2074 8.46228 104.994 5.62939C110.78 2.79651 109.685 0.5 115.471 0.5C121.258 0.5 120.162 2.79651 125.949 5.62939C131.735 8.46228 130.64 10.7588 136.426 10.7588C142.213 10.7588 141.117 8.46228 146.904 5.62939C152.69 2.79651 151.594 0.5 157.381 0.5C163.167 0.5 162.072 2.79651 167.858 5.62939C173.645 8.46228 172.549 10.7588 178.336 10.7588C184.122 10.7588 183.027 8.46228 188.813 5.62939C194.6 2.79651 193.504 0.5 199.291 0.5C205.077 0.5 203.982 2.79651 209.768 5.62939C215.555 8.46228 214.459 10.7588 220.245 10.7588C226.032 10.7588 224.936 8.46228 230.723 5.62939C236.509 2.79651 235.414 0.5 241.2 0.5C246.987 0.5 245.891 2.79651 251.678 5.62939C257.464 8.46228 256.369 10.7588 262.155 10.7588C267.942 10.7588 266.846 8.46228 272.633 5.62939C278.419 2.79651 277.323 0.5 283.11 0.5C288.897 0.5 287.801 2.79651 293.587 5.62939C299.374 8.46228 298.278 10.7588 304.065 10.7588C309.851 10.7588 308.756 8.46228 314.542 5.62939C320.329 2.79651 319.233 0.5 325.02 0.5C330.806 0.5 329.711 2.79651 335.497 5.62939"
                stroke="white"
                viewport={{ once: true }}
              />
            </svg>
          </div>
        </div>

        <div className="flex gap-12">
          <div className="basis-1/6 shrink-0 flex gap-48 flex-col justify-between self-stretch">
            <div className="flex gap-2 tabular-nums text-sm items-center">
              <span>01</span>

              <span className="relative flex-1 flex items-center">
                <div className="w-full h-px bg-white min-w-40" />
                <div
                  className="handle absolute top-1/2 h-2 -translate-y-1/2 bg-orange-500"
                  style={{
                    width: `${scroll.viewportRatio * 100}%`,
                    left: `${scroll.progress * (1 - scroll.viewportRatio) * 100}%`,
                  }}
                />
              </span>

              <span>{count}</span>
            </div>

            <TestimonyNav carouselRef={carouselRef} />
          </div>

          <div className="testimony-carousel flex-1 p-6 relative h-123">
            <div
              ref={carouselRef}
              className="flex absolute inset-0 scrollbar-none grow-0 overflow-x-auto snap-x snap-start snap-proximity space-x-4"
            >
              {testimonies.map((testimony, index) => {
                return (
                  <div
                    key={index}
                    className="flex-none w-[384px] border border-[#3FD6FC]/10 shadow-md snap-center flex flex-col aspect-384/492"
                  >
                    <p className="text-pretty mt-2 flex-1 p-4 text-base font-thin text-start">
                      {testimony.comment}
                    </p>

                    <figure className="flex border-t border-[#3FD6FC]/10">
                      <Image
                        src={testimony.avatar}
                        // src={null}
                        width={72}
                        height={72}
                        alt={testimony.name}
                        className="w-16 h-16 shrink-0 object-cover"
                      />

                      <figcaption className="text-start flex border-l bg-[#1B2332]/40 border-[#3FD6FC]/10 w-full flex-col px-4 justify-center">
                        <p className="font-semibold">{testimony.name}</p>
                        <p className="text-muted-foreground">
                          {testimony.title}
                        </p>
                      </figcaption>
                    </figure>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
