// @vitest-environment node

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ThemeSelect } from "./theme-select";

// useTheme() reads localStorage on the client but not on the server. If the
// theme value reaches the first render, the server markup and the hydration
// render disagree and React throws error #418.
let storedTheme: string | undefined = "dark";
vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: storedTheme, setTheme: vi.fn() }),
}));

describe("ThemeSelect", () => {
  it("does not leak the stored theme into the server render", () => {
    storedTheme = "dark";
    const dark = renderToStaticMarkup(<ThemeSelect />);
    storedTheme = "light";
    const light = renderToStaticMarkup(<ThemeSelect />);
    storedTheme = undefined;
    const unthemed = renderToStaticMarkup(<ThemeSelect />);

    expect(light).toBe(dark);
    expect(unthemed).toBe(dark);
  });

  it("renders the trigger empty, not pre-selected, on the server", () => {
    storedTheme = "dark";
    expect(renderToStaticMarkup(<ThemeSelect />)).toContain("data-placeholder");
  });
});
