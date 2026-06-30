"use client";
import { debounce, throttle } from "lodash-es";
import React from "react";

export function SoftExit({ children, ...props }: React.ComponentProps<"div">) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    const ab = new AbortController();
    const cont = ref.current;

    if (!cont) return;

    const soft: HTMLDivElement | null = document.querySelector("#soft");
    if (!soft) return;

    const originalOffset = soft.offsetTop;
    const height = 150;

    const reset = debounce(() => {
      cont.style.setProperty("--blur-size", `${window.scrollY}px`);
    }, 100);

    let last_offset = 0;

    window.addEventListener(
      "scroll",
      () => {
        const offsetTop = originalOffset + height;
        const dir = window.scrollY > last_offset ? "down" : "up";
        last_offset = window.scrollY;

        const show_popup = window.scrollY > offsetTop;
        // console.log({ dir, scrollTop: window.scrollY, offsetTop, show_popup });

        if (dir === "down" && show_popup) {
          cont.style.setProperty("--blur-size", `${height}px`);
          return;
        } else if (window.scrollY <= offsetTop) {
          reset();
        }
      },
      { signal: ab.signal },
    );

    return () => {
      ab.abort();
    };
  }, []);

  return (
    <div ref={ref}>
      <div
        id="soft"
        className="w-full fixed h-(--blur-size) top-0 transition-all pointer-events-none bg-gradient-to-b from-(--voxx-bg) via-(--voxx-bg) to-transparent"
      />
      <div {...props}>{children}</div>
    </div>
  );
}
