// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DataList } from "./data-list";

afterEach(() => {
  cleanup();
});

describe("DataList", () => {
  it("renders the 30/70 key/value grid by default", () => {
    const { getByText } = render(
      <DataList>
        <DataList.Item label="Total owed">₦2,600.00</DataList.Item>
      </DataList>,
    );

    const dl = getByText("Total owed").closest("dl");
    expect(dl).not.toBeNull();
    expect(dl?.className).toContain("grid-cols-[0.3fr_0.7fr]");
    expect(getByText("₦2,600.00").tagName).toBe("DD");
    expect(getByText("Total owed").tagName).toBe("DT");
  });

  it("lets the caller override the grid with className", () => {
    const { getByText } = render(
      <DataList className="grid-cols-[0.2fr_0.8fr]">
        <DataList.Item label="Key">value</DataList.Item>
      </DataList>,
    );

    const dl = getByText("Key").closest("dl");
    expect(dl?.className).toContain("grid-cols-[0.2fr_0.8fr]");
    expect(dl?.className).not.toContain("0.3fr");
  });

  it("passes value classes through and keeps the muted key", () => {
    const { getByText } = render(
      <DataList>
        <DataList.Item label="Balance due" className="tabular-nums">
          ₦2,000.00
        </DataList.Item>
      </DataList>,
    );

    const dd = getByText("₦2,000.00");
    expect(dd.className).toContain("tabular-nums");
    expect(dd.className).toContain("text-foreground");
    expect(getByText("Balance due").className).toContain(
      "text-muted-foreground",
    );
  });
});
