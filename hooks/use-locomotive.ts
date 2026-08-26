import type LocomotiveScroll from "locomotive-scroll";
import React, { useEffect } from "react";

const GLOBAL_VAR = Symbol("___$locomotive" as const);

export function useLocomotive() {
  const locoInstanceRef = React.useRef(null);
  const [scroll, setScroll] = React.useState<LocomotiveScroll | null>(null);

  useEffect(() => {
    let scroll: LocomotiveScroll | null = null;
    (async () => {
      if (GLOBAL_VAR in window) {
        return console.warn(
          "Multiple locomotive instance detached. useLocomotive Hook invoked multiple times",
        );
      }

      const LocomotiveScroll = (await import("locomotive-scroll")).default;

      scroll = new LocomotiveScroll({});
      // @ts-expect-error Global variable
      window[GLOBAL_VAR] = scroll;
      setScroll(scroll);
    })();

    // Important: clean up on unmount
    return () => {
      // @ts-expect-error Global variable
      delete window[GLOBAL_VAR];
      scroll?.destroy?.();
      locoInstanceRef.current = null;
    };
  }, []);

  return { scroll };
}
