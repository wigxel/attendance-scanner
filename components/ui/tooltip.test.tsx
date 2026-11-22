// @vitest-environment jsdom
import { cleanup } from "@testing-library/react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

/**
 * The metrics cards sit in a CardDescription (<p>). A tooltip without a
 * Portal mounts its <div> in place, and <p> cannot contain a nested <div>
 * (hydration error). The content must render through a portal at body level.
 */
describe("TooltipContent", () => {
  it("portals its content out of a <p> instead of nesting inside it", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const errors: unknown[][] = [];
    const spy = vi.spyOn(console, "error").mockImplementation((...args) => {
      errors.push(args);
    });

    await act(async () => {
      createRoot(container).render(
        <TooltipProvider>
          <p>
            Due date
            <Tooltip defaultOpen>
              <TooltipTrigger asChild>
                <button type="button">info</button>
              </TooltipTrigger>
              <TooltipContent>Why this matters</TooltipContent>
            </Tooltip>
          </p>
        </TooltipProvider>,
      );
    });

    spy.mockRestore();

    const nestingErrors = errors.filter(([first]) =>
      String(first).includes("cannot contain a nested"),
    );
    if (nestingErrors.length > 0) {
      console.log("NESTING ERROR DETAIL:", nestingErrors[0]);
      console.log("P INNERHTML:", container.querySelector("p")?.innerHTML);
    }
    expect(nestingErrors).toHaveLength(0);

    // Open content lives at body level, never inside the <p>.
    expect(container.querySelectorAll("p div")).toHaveLength(0);
    const tooltip = document.body.querySelector<HTMLElement>("[role=tooltip]");
    expect(tooltip?.textContent).toBe("Why this matters");
  });
});
