// @vitest-environment node

import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PushGate, resolveGate } from "./push-gate";

const push = vi.hoisted(() => ({
  status: "ask",
  error: null as string | null,
  busy: false,
  available: true,
  enable: vi.fn(),
  recheck: vi.fn(),
}));

vi.mock("@/hooks/use-push-notifications", () => ({
  usePushNotifications: () => push,
  supportsPush: () => true,
}));

// Radix portals render nothing during SSR, so pass the primitives through.
type PassProps = { children?: ReactNode };

vi.mock("@radix-ui/react-alert-dialog", () => {
  const Pass = ({ children }: PassProps) => children;
  return {
    Root: Pass,
    Portal: Pass,
    Overlay: Pass,
    Content: Pass,
    Title: Pass,
    Description: Pass,
    Trigger: Pass,
    Action: Pass,
    Cancel: Pass,
  };
});

beforeEach(() => {
  push.status = "ask";
  push.error = null;
  push.busy = false;
});

describe("resolveGate", () => {
  it.each([
    ["checking", "hidden"],
    ["subscribed", "hidden"],
    ["unavailable", "hidden"],
    ["ask", "ask"],
    ["blocked", "blocked"],
    ["unsupported", "unsupported"],
  ] as const)("maps %s to %s", (status, expected) => {
    expect(resolveGate(status)).toBe(expected);
  });
});

describe("PushGate", () => {
  it("renders the ask screen with an enable action", () => {
    const html = renderToStaticMarkup(<PushGate />);
    expect(html).toContain("Turn on notifications for this device");
    expect(html).toContain("Guest overstay and environment alerts");
    expect(html).toContain("Enable notifications");
  });

  it("renders unblock instructions for a denied browser", () => {
    push.status = "blocked";
    const html = renderToStaticMarkup(<PushGate />);
    expect(html).toContain("Notifications are blocked for this site");
    expect(html).toContain("padlock/site settings");
    expect(html).toContain("Check again");
  });

  it("renders the unsupported browser screen", () => {
    push.status = "unsupported";
    const html = renderToStaticMarkup(<PushGate />);
    expect(html).toContain("Chrome or Edge");
  });

  it("renders the inline error under the action", () => {
    push.error = "Could not turn on notifications.";
    const html = renderToStaticMarkup(<PushGate />);
    expect(html).toContain("Could not turn on notifications.");
  });

  it.each(["subscribed", "checking", "unavailable"])(
    "renders nothing when %s",
    (status) => {
      push.status = status;
      expect(renderToStaticMarkup(<PushGate />)).toBe("");
    },
  );
});
