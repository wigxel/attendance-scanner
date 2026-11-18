// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { FilterDropdown } from "./filter-dropdown";

const options = [
  { value: "cash", label: "Cash" },
  { value: "pos", label: "POS" },
] as const;

// jsdom lacks the browser APIs Radix positions and focuses with.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver =
  ResizeObserverStub as unknown as typeof ResizeObserver;
Element.prototype.scrollIntoView = () => {};

/** Class list of the check icon inside the menu row with the given label. */
function checkIcon(label: string) {
  return screen
    .getByText(label)
    .closest('[role="menuitem"]')
    ?.querySelector("svg");
}

function checked(label: string) {
  return checkIcon(label)?.classList.contains("visible");
}

async function openMenu(value: "cash" | "pos" | undefined) {
  const user = userEvent.setup();
  render(
    <FilterDropdown value={value} options={options} onChange={() => {}} />,
  );
  await user.click(screen.getByRole("button", { name: /Filter/ }));
}

afterEach(cleanup);

describe("FilterDropdown", () => {
  it("checks All only when no option is selected", async () => {
    await openMenu(undefined);

    expect(checked("All")).toBe(true);
  });

  it("checks the selected option and nothing else", async () => {
    await openMenu("cash");

    expect(checked("All")).toBe(false);
    expect(checked("Cash")).toBe(true);
    expect(checked("POS")).toBe(false);
  });
});
