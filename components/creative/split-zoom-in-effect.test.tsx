// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SplitZoomInEffect } from "./split-zoom-in-effect";

describe("SplitZoomInEffect", () => {
  it("throws when given more than one child", () => {
    expect(() =>
      renderToStaticMarkup(
        <SplitZoomInEffect>
          <div>a</div>
          <div>b</div>
        </SplitZoomInEffect>,
      ),
    ).toThrow("exactly one child");
  });

  it("binds its size to the single child", () => {
    const html = renderToStaticMarkup(
      <SplitZoomInEffect>
        <div>a</div>
      </SplitZoomInEffect>,
    );

    expect(html).toContain("w-fit");
    expect(html).toContain(">a<");
  });

  it("accepts one child", () => {
    expect(() =>
      renderToStaticMarkup(
        <SplitZoomInEffect>
          <div>a</div>
        </SplitZoomInEffect>,
      ),
    ).not.toThrow();
  });

  it("renders a cover painted in the shutter color", () => {
    const html = renderToStaticMarkup(
      <SplitZoomInEffect>
        <div>a</div>
      </SplitZoomInEffect>,
    );

    expect(html).toContain("data-shutter-cover");
    expect(html).toContain("var(--shutter-color, var(--primary))");
  });

  it("passes custom properties through to the wrapper", () => {
    const html = renderToStaticMarkup(
      <SplitZoomInEffect style={{ "--shutter-color": "white" }}>
        <div>a</div>
      </SplitZoomInEffect>,
    );

    expect(html).toContain("--shutter-color:white");
  });

  it("stretches over the parent when fill is set", () => {
    const html = renderToStaticMarkup(
      <SplitZoomInEffect fill>
        <div>a</div>
      </SplitZoomInEffect>,
    );

    expect(html).toContain("absolute inset-0");
    expect(html).not.toContain("w-fit");
  });
});
