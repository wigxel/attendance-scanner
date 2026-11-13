// @vitest-environment node

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CommunityLinks } from "./community-links";

vi.mock("next/image", () => ({ default: () => null }));
vi.mock("posthog-js", () => ({ default: { capture: vi.fn() } }));

const html = renderToStaticMarkup(<CommunityLinks />);

describe("CommunityLinks", () => {
  it("renders the three community cards in order", () => {
    expect(html).toContain("InSpace Makers");
    expect(html).toContain("InSpace Lounge");
    expect(html).toContain("InSpace on Instagram");
    expect(html.indexOf("InSpace Makers")).toBeLessThan(
      html.indexOf("InSpace Lounge"),
    );
    expect(html.indexOf("InSpace Lounge")).toBeLessThan(
      html.indexOf("InSpace on Instagram"),
    );
  });

  it("renders each card's copy", () => {
    expect(html).toContain(
      "Get Inspired by Makers around you and get the chance to inspire others.",
    );
    expect(html).toContain(
      "Stay up to date with the latest updates in the inSpace community.",
    );
    expect(html).toContain(
      "Get to know more about InSpace and the change we want to introduce.",
    );
  });

  it("links each card to its shortlink in a new tab", () => {
    for (const channel of ["makers", "lounge", "instagram"]) {
      expect(html).toContain(`href="/shortlinks/${channel}"`);
    }
    expect(html.match(/target="_blank"/g)).toHaveLength(3);
  });
});
