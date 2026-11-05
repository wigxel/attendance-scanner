// @vitest-environment node

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { CheckInMode } from "@/convex/shared";
import { CheckInModeRadioGroup } from "./check-in-mode-radio-group";

function render(value: CheckInMode) {
  return renderToStaticMarkup(
    <CheckInModeRadioGroup value={value} onChange={() => {}} />,
  );
}

describe("CheckInModeRadioGroup", () => {
  it("shows every mode with a description", () => {
    const html = render("self_checkin");

    expect(html).toContain("One-tap");
    expect(html).toContain("The customer taps");
    expect(html).toContain("on their account page.");
    expect(html).toContain("Self check-in");
    expect(html).toContain(
      "The customer scans the entrance QR code themselves.",
    );
    expect(html).toContain("Staff scan the customer");
  });

  it("checks only the selected mode", () => {
    const html = render("self_checkin");

    expect(html.match(/role="radio"/g)).toHaveLength(3);
    expect(html.match(/aria-checked="true"/g)).toHaveLength(1);
  });
});
