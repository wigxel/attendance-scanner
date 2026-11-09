// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { MobileMenu, MobileMenuContent } from "./mobile-menu";

describe("MobileMenuContent", () => {
  afterEach(() => {
    delete (globalThis as { document?: unknown }).document;
  });

  it("renders nothing on the first pass even when a document exists", () => {
    // On the client the first render sees `document` but has not run effects
    // yet, so it must match what the server emitted.
    (globalThis as { document?: unknown }).document = { body: {} };

    const html = renderToStaticMarkup(
      <MobileMenu>
        <MobileMenuContent>menu</MobileMenuContent>
      </MobileMenu>,
    );

    expect(html).toBe("");
  });
});
