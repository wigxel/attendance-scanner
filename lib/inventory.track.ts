"use client";

import posthog from "posthog-js";
import { useEffect, useRef } from "react";

/**
 * Frontend-only tracking of inventory actions and interactions. Event names
 * are snake_case with an `inventory_` prefix; properties use snake_case too.
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
  const latest = useRef(props);
  latest.current = props;
  const wasOpen = useRef(false);

  useEffect(() => {
    if (open && !wasOpen.current) {
      track(event, latest.current);
    }
    wasOpen.current = open;
  }, [event, open]);
}
