import Image from "next/image";
import Balancer from "react-wrap-balancer";
import { cn } from "@/lib/utils";
import { CircularButton } from "../circular-button";
import { Fit } from "../creative/fit";

export function MakersHero() {
  return (
    <div className="bg-background relative">
      <div className="max-h-[82svh] bg-background-lv1 absolute w-full inset-0" />

      <div className="w-4 h-4 z-100 rotate-90 absolute top-0 left-0">
        <div className="w-svh flex items-start [--text-outline-color:(--color-blue-100)]">
          <Fit options={{ multiLine: false, minSize: 80 }}>
            <span
              className="not-sr-only text-stroke opacity-25 tracking-[-0.1ch] leading-0"
              style={
                {
                  "--text-outline-color": "var(--color-cyan-500)",
                } as React.CSSProperties
              }
            >
              Makers
            </span>
          </Fit>
        </div>
      </div>

      <section
        id="top"
        className="container px-4 relative z-20 mx-auto gap-5 grid grid-cols-12"
      >
        <div className="col-auto" />

        <div className="py-32 col-span-5 flex flex-col gap-14">
          <h1
            className={cn("font-heading tracking-tighter font-black text-9xl")}
          >
            <Balancer className="leading-[0.8]!">
              Build <br /> with InSpace Makers
            </Balancer>
          </h1>

          <p className="max-w-[45ch] font-thin text-lg text-pretty">
            Inspace Makers unites Nigerian developers and Makers. Their work is
            verified against a shared standard. Real projects ship for the
            organisations that need them.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <CircularButton
              variant="default"
              text="VIEW ALL PROJECTS"
              className="hover"
            />
          </div>
        </div>

        <div className="overflow-clip col-span-6 scanline-container relative after:z-10! mt-32">
          <Image
            src="/images/makers/cover-image.webp"
            loading="eager"
            fill
            fetchPriority="high"
            className="z-0 relative object-cover"
            alt="A electronics engineer repairing a drone"
          />
        </div>
      </section>
    </div>
  );
}
