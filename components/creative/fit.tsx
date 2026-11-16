"use client";

import { Slot } from "@radix-ui/react-slot";
import fitty from "fitty";
import { useEffect, useRef } from "react";

interface FitProps {
  children: React.ReactNode;
  options?: {
    minSize?: number;
    maxSize?: number;
    multiLine?: boolean;
    observeMutations?: MutationObserverInit;
  };
}

export function Fit({ children, options }: FitProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.classList.remove("invisible");
      const instance = fitty(ref.current, options);

      return () => instance.unsubscribe();
    }
  }, [options]);

  return (
    <Slot ref={ref} className="invisible">
      {children}
    </Slot>
  );
}
