// @vitest-environment node
import { describe, expect, it } from "vitest";
import { shouldLoadMore } from "./DataTable";

describe("shouldLoadMore", () => {
  it("fetches the next server page on the last local page", () => {
    expect(
      shouldLoadMore({ canNextPage: false, hasMore: true, isLoading: false }),
    ).toBe(true);
  });

  it("waits while the next page is already loading", () => {
    expect(
      shouldLoadMore({ canNextPage: false, hasMore: true, isLoading: true }),
    ).toBe(false);
  });

  it("stays put while local pages remain", () => {
    expect(
      shouldLoadMore({ canNextPage: true, hasMore: true, isLoading: false }),
    ).toBe(false);
  });

  it("stops when the server has no more rows", () => {
    expect(
      shouldLoadMore({ canNextPage: false, hasMore: false, isLoading: false }),
    ).toBe(false);
  });
});
