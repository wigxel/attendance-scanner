"use client";
import { useLocomotive } from "@/hooks/use-locomotive";
import "locomotive-scroll/dist/locomotive-scroll.css";
import { throttle } from "lodash-es";
import { motion } from "motion/react";
import React from "react";
import { createStore, useStore } from "zustand";

const headerSharedState = createStore<{ sticky: boolean }>()(() => {
  return { sticky: false };
});

export function HeaderBackground() {
  useLocomotive();
  useObserveOffset();
  const state = useStore(headerSharedState);

  return (
    <motion.div
      className="absolute h-0 z-0 w-full bg-background"
      animate={{ height: !state.sticky ? 0 : "100%" }}
    />
  );
}

function useObserveOffset() {
  React.useLayoutEffect(() => {
    const throttleUpdate = throttle((prop: { sticky: boolean }) => {
      headerSharedState.setState(prop);
    }, 500);

    if (typeof window === "undefined") return;

    const getHeaderHeight = () => {
      const header =
        document.querySelector("header.sticky") ??
        document.querySelector("header");
      return (header as HTMLElement | null)?.offsetHeight ?? 0;
    };

    const onScrollOrResize = () => {
      const offset =
        window.pageYOffset ?? document.documentElement.scrollTop ?? 0;
      const headerHeight = getHeaderHeight();

      // If the page offset is greater than the header height, use 'outline', otherwise 'default'
      throttleUpdate({ sticky: offset > headerHeight });
    };

    onScrollOrResize();
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, []);
}
