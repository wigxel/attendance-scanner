import { hash } from "ohash";
import { describe, expect, it } from "vitest";
import {
  type Position,
  type SLEntry,
  orderCells,
  reorderSeats,
} from "./seat-grid-utils";

describe("orderCells", () => {
  it("returns empty array for empty input", () => {
    const result = orderCells([]);
    expect(result).toHaveLength(0);
  });

  it("returns single position with order 0", () => {
    const input: Position[] = [{ rowIndex: 2, colIndex: 3 }];
    const result = orderCells(input);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      position: { rowIndex: 2, colIndex: 3 },
      order: 0,
    });
  });

  it("returns same order for already sorted positions", () => {
    const input: Position[] = [
      { rowIndex: 0, colIndex: 0 },
      { rowIndex: 0, colIndex: 1 },
      { rowIndex: 1, colIndex: 0 },
      { rowIndex: 1, colIndex: 1 },
    ];
    const result = orderCells(input);
    expect(result.map((c) => c.order)).toEqual([0, 1, 2, 3]);
    expect(result[0].position).toEqual({ rowIndex: 0, colIndex: 0 });
    expect(result[3].position).toEqual({ rowIndex: 1, colIndex: 1 });
  });

  it("sorts unsorted positions in row-major order", () => {
    const input: Position[] = [
      { rowIndex: 3, colIndex: 2 },
      { rowIndex: 0, colIndex: 0 },
      { rowIndex: 1, colIndex: 1 },
      { rowIndex: 0, colIndex: 1 },
    ];
    const result = orderCells(input);
    expect(result[0].position).toEqual({ rowIndex: 0, colIndex: 0 });
    expect(result[1].position).toEqual({ rowIndex: 0, colIndex: 1 });
    expect(result[2].position).toEqual({ rowIndex: 1, colIndex: 1 });
    expect(result[3].position).toEqual({ rowIndex: 3, colIndex: 2 });
  });

  it("sorts by colIndex when positions share the same row", () => {
    const input: Position[] = [
      { rowIndex: 0, colIndex: 3 },
      { rowIndex: 0, colIndex: 0 },
      { rowIndex: 0, colIndex: 2 },
      { rowIndex: 0, colIndex: 1 },
    ];
    const result = orderCells(input);
    expect(result[0].position).toEqual({ rowIndex: 0, colIndex: 0 });
    expect(result[1].position).toEqual({ rowIndex: 0, colIndex: 1 });
    expect(result[2].position).toEqual({ rowIndex: 0, colIndex: 2 });
    expect(result[3].position).toEqual({ rowIndex: 0, colIndex: 3 });
  });

  it("sorts by rowIndex when positions share the same column", () => {
    const input: Position[] = [
      { rowIndex: 3, colIndex: 0 },
      { rowIndex: 0, colIndex: 0 },
      { rowIndex: 2, colIndex: 0 },
      { rowIndex: 1, colIndex: 0 },
    ];
    const result = orderCells(input);
    expect(result[0].position).toEqual({ rowIndex: 0, colIndex: 0 });
    expect(result[1].position).toEqual({ rowIndex: 1, colIndex: 0 });
    expect(result[2].position).toEqual({ rowIndex: 2, colIndex: 0 });
    expect(result[3].position).toEqual({ rowIndex: 3, colIndex: 0 });
  });

  it("does not mutate the original array", () => {
    const input: Position[] = [
      { rowIndex: 3, colIndex: 2 },
      { rowIndex: 0, colIndex: 1 },
    ];
    const snapshot = [...input];
    orderCells(input);
    expect(input).toEqual(snapshot);
  });

  it("matches the JSDoc example", () => {
    const input: Position[] = [
      { rowIndex: 0, colIndex: 0 },
      { rowIndex: 3, colIndex: 2 },
      { rowIndex: 4, colIndex: 4 },
      { rowIndex: 0, colIndex: 1 },
    ];
    const result = orderCells(input);
    expect(result.map((c) => c.position)).toEqual([
      { rowIndex: 0, colIndex: 0 },
      { rowIndex: 0, colIndex: 1 },
      { rowIndex: 3, colIndex: 2 },
      { rowIndex: 4, colIndex: 4 },
    ]);
  });
});

describe("reorderSeats", () => {
  it("assigns sequential seat numbers in row-major order without mutating input", () => {
    const input = [
      {
        type: "seat",
        index: "2",
        seatNumber: 1,
        position: { rowIndex: 0, colIndex: 5 },
      },
      {
        type: "seat",
        index: "6",
        seatNumber: 2,
        position: { colIndex: 0, rowIndex: 0 },
      },
      {
        type: "seat",
        index: "3",
        seatNumber: 3,
        position: { rowIndex: 0, colIndex: 6 },
      },
      {
        type: "seat",
        index: "9",
        seatNumber: 4,
        position: { colIndex: 3, rowIndex: 1 },
      },
      {
        type: "seat",
        index: "4",
        seatNumber: 5,
        position: { rowIndex: 0, colIndex: 7 },
      },
      {
        type: "table",
        index: "5",
        position: { rowIndex: 1, colIndex: 5 },
        attributes: { size: "lg", rotation: "horizontal" },
      },
      {
        type: "seat",
        index: "6",
        seatNumber: 6,
        position: { colIndex: 1, rowIndex: 0 },
      },
      {
        type: "table",
        index: "7",
        position: { colIndex: 1, rowIndex: 1 },
        attributes: { size: "sm", rotation: "horizontal" },
      },
      {
        type: "seat",
        index: "8",
        seatNumber: 7,
        position: { colIndex: 0, rowIndex: 1 },
      },

      {
        type: "table",
        index: "7",
        position: { colIndex: 2, rowIndex: 0 },
        attributes: { size: "sm", rotation: "horizontal" },
      },
    ] satisfies SLEntry[];

    const result = reorderSeats(input);

    expect(hash(input)).not.toBe(hash(result));

    const seats = result.filter((e) => e.type === "seat");
    expect(seats).toHaveLength(7);

    const sorted = [...seats].sort((a, b) => a.seatNumber - b.seatNumber);
    expect(sorted.map((s) => s.seatNumber)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(sorted.map((s) => s.position)).toEqual([
      { rowIndex: 0, colIndex: 0 },
      { rowIndex: 0, colIndex: 1 },
      { rowIndex: 0, colIndex: 5 },
      { rowIndex: 0, colIndex: 6 },
      { rowIndex: 0, colIndex: 7 },
      { rowIndex: 1, colIndex: 0 },
      { rowIndex: 1, colIndex: 3 },
    ]);

    const tables = result.filter((e) => e.type === "table");
    expect(tables).toHaveLength(3);

    for (const table of tables) {
      expect(table).not.toHaveProperty("seatNumber");
    }
  });
});
