"use client";

import posthog from "posthog-js";
import { useEffect, useRef } from "react";

/**
 * Frontend analytics helpers. `track` wraps `posthog.capture`; event names are
 * snake_case, prefixed by their domain (`inventory_`, …); properties too.
 */
export function track(event: string, props?: Record<string, unknown>): void {
  posthog.capture(event, props);
}

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
