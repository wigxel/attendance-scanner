"use client";

import posthog from "posthog-js";

/**
 * Frontend analytics helper. `track` wraps `posthog.capture`; event names are
 * snake_case, prefixed by their domain (`inventory_`, …); properties too.
 */
export function track(event: string, props?: Record<string, unknown>): void {
  posthog.capture(event, props);
}
