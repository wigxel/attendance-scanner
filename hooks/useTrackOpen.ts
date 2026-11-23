"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics";

/**
 * Fires `event` once each time the dialog/sheet transitions closed → open.
 * Closing and reopening fires it again; prop changes while open do not.
 */
export function useTrackOpen(
  event: string,
  open: boolean,
  props?: Record<string, unknown>,
): void {
  // Props go through a ref so a fresh object literal on every render cannot
  // rerun the effect; the open-transition guard below decides when it fires.
  const latestProps = useRef(props);
  latestProps.current = props;
  const wasOpen = useRef(false);

  useEffect(() => {
    if (open && !wasOpen.current) {
      track(event, latestProps.current);
    }
    wasOpen.current = open;
  }, [event, open]);
}
