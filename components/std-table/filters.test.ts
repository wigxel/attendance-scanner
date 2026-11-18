// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { buildFilterMeta, filterParsers } from "./filters";

const channelOptions = [
  { value: "cash", label: "Cash" },
  { value: "pos", label: "POS" },
];

describe("filterParsers", () => {
  it("keys each parser by id when no queryKey is given", () => {
    const parsers = filterParsers({ channel: { options: channelOptions } });

    expect(Object.keys(parsers)).toEqual(["channel"]);
  });

  it("uses the explicit queryKey when one is given", () => {
    const parsers = filterParsers({
      channel: { options: channelOptions, queryKey: "sales_channel" },
    });

    expect(Object.keys(parsers)).toEqual(["sales_channel"]);
  });
});

describe("buildFilterMeta", () => {
  it("reads the value from the query under the derived key", () => {
    const meta = buildFilterMeta(
      { channel: { options: channelOptions } },
      { channel: "cash" },
      () => {},
    );

    expect(meta.channel.value).toBe("cash");
  });

  it("leaves the value undefined when the query has no entry", () => {
    const meta = buildFilterMeta(
      { channel: { options: channelOptions } },
      {},
      () => {},
    );

    expect(meta.channel.value).toBeUndefined();
  });

  it("reads through an explicit queryKey", () => {
    const meta = buildFilterMeta(
      { channel: { options: channelOptions, queryKey: "sales_channel" } },
      { sales_channel: "pos" },
      () => {},
    );

    expect(meta.channel.value).toBe("pos");
  });

  it("clears by writing null to the key", () => {
    const setQuery = vi.fn();

    buildFilterMeta(
      { channel: { options: channelOptions } },
      {},
      setQuery,
    ).channel.onChange(undefined);

    expect(setQuery).toHaveBeenCalledWith({ channel: null });
  });

  it("writes the chosen value to the key", () => {
    const setQuery = vi.fn();

    buildFilterMeta(
      { channel: { options: channelOptions } },
      {},
      setQuery,
    ).channel.onChange("pos");

    expect(setQuery).toHaveBeenCalledWith({ channel: "pos" });
  });

  it("writes to the explicit queryKey", () => {
    const setQuery = vi.fn();

    buildFilterMeta(
      { channel: { options: channelOptions, queryKey: "sales_channel" } },
      {},
      setQuery,
    ).channel.onChange("pos");

    expect(setQuery).toHaveBeenCalledWith({ sales_channel: "pos" });
  });
});
