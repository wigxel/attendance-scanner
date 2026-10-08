import { describe, expect, it } from "vitest";
import {
  getBucketIndex,
  getColor,
  getColors,
  getFallbackColor,
} from "../../../../../lib/temperature-colors";
import { addDays, format, startOfWeek, subDays } from "date-fns";

describe("getBucketIndex", () => {
  it("buckets by comfort-aligned thresholds", () => {
    expect(getBucketIndex(20)).toBe(0);
    expect(getBucketIndex(21.9)).toBe(0);
    expect(getBucketIndex(22)).toBe(1);
    expect(getBucketIndex(25.9)).toBe(1);
    expect(getBucketIndex(26)).toBe(2);
    expect(getBucketIndex(29.9)).toBe(2);
    expect(getBucketIndex(30)).toBe(3);
    expect(getBucketIndex(32.9)).toBe(3);
    expect(getBucketIndex(33)).toBe(4);
    expect(getBucketIndex(40)).toBe(4);
  });
});

describe("getColor hex palette", () => {
  it("null returns var(--background-lv1)", () => {
    expect(getColor(null)).toBe("var(--background-lv1)");
    expect(getFallbackColor(null)).toBe("var(--background-lv1)");
  });
  it("cold #0102FC at bucket 0", () => {
    expect(getColor(20)).toBe("#0102FC");
    expect(getFallbackColor(20)).toBe("#0102FC");
  });
  it("warm #FD3001 at bucket 4", () => {
    expect(getColor(34)).toBe("#FD3001");
    expect(getFallbackColor(34)).toBe("#FD3001");
  });
  it("mid bucket 2 #02C7FE", () => {
    expect(getColor(27)).toBe("#02C7FE");
  });
  it("getColors returns 5 hex palette", () => {
    expect(getColors()).toEqual([
      "#0102FC",
      "#0254FE",
      "#02C7FE",
      "#FD9704",
      "#FD3001",
    ]);
  });
});

describe("trailing week 53x7", () => {
  it("last column is current week", () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = startOfWeek(subDays(today, 52 * 7), { weekStartsOn: 0 });
    const cells = Array.from({ length: 371 }, (_, index) =>
      addDays(startDate, index),
    );
    const lastCell = cells[cells.length - 1];
    const todayDay = today.getDay();
    const lastCellDay = lastCell.getDay();
    expect(lastCellDay).toBe(6);
    expect(cells.length).toBe(371);
    expect(format(cells[cells.length - 1 - (6 - todayDay)], "yyyy-MM-dd")).toBe(
      format(today, "yyyy-MM-dd"),
    );
  });
  it("has 53 columns", () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = startOfWeek(subDays(today, 52 * 7), { weekStartsOn: 0 });
    const columns = new Set(
      Array.from({ length: 371 }, (_, index) => Math.floor(index / 7)),
    );
    expect(columns.size).toBe(53);
    expect(startDate.getDay()).toBe(0);
  });
});
