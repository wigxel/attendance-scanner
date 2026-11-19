// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCssVarInPx, getDocumentCssVarInPx } from "./css.helpers";

let values: Record<string, string>;

beforeEach(() => {
  values = {};
  vi.stubGlobal(
    "getComputedStyle",
    vi.fn(() => ({
      getPropertyValue: (name: string) => values[name] ?? "",
      fontSize: "16px",
    })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getCssVarInPx", () => {
  it("reads px values", () => {
    values["--shutter-height"] = "250px";

    expect(getCssVarInPx(document.documentElement, "--shutter-height")).toBe(
      250,
    );
  });

  it("scales rem values by the root font size", () => {
    values["--shutter-height"] = "20rem";

    expect(getCssVarInPx(document.documentElement, "--shutter-height")).toBe(
      320,
    );
  });

  it("parses bare numbers as px", () => {
    values["--shutter-height"] = "250";

    expect(getCssVarInPx(document.documentElement, "--shutter-height")).toBe(
      250,
    );
  });

  it("returns 0 when the variable is unset", () => {
    expect(getCssVarInPx(document.documentElement, "--shutter-height")).toBe(0);
  });

  it("returns 0 for unparseable values", () => {
    values["--shutter-height"] = "auto";

    expect(getCssVarInPx(document.documentElement, "--shutter-height")).toBe(0);
  });
});

describe("getDocumentCssVarInPx", () => {
  it("reads through window.document to :root", () => {
    values["--shutter-height"] = "120px";

    expect(getDocumentCssVarInPx("--shutter-height")).toBe(120);
  });

  it("scales rem values by the root font size", () => {
    values["--shutter-height"] = "10rem";

    expect(getDocumentCssVarInPx("--shutter-height")).toBe(160);
  });

  it("returns 0 when the variable is unset", () => {
    expect(getDocumentCssVarInPx("--shutter-height")).toBe(0);
  });
});
