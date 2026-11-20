// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Greeting } from "./greeting";

describe("Greeting", () => {
  // Regression: the greeting used to run new Date().getHours() on the server.
  // When the user's local hour straddles the morning/afternoon/evening
  // boundary relative to the server's UTC hour, SSR text differs from the
  // client text and hydration throws React error #418. The server render
  // must stay empty.
  it("renders nothing on the server", () => {
    expect(renderToStaticMarkup(<Greeting className="text-sm" />)).toBe(
      `<span class="text-sm"></span>`,
    );
  });
});
