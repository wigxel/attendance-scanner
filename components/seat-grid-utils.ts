import { isNullable } from "effect/Predicate";
import type { Prettify } from "@/types";

export type Position = { rowIndex: number; colIndex: number };

type ObjectEntryShared<T> = Prettify<
  T & {
    index: string;
    position: Position;
    attributes?: Record<string, unknown>;
  }
>;

type TableEntry = ObjectEntryShared<{
  type: "table";
}>;

type SeatEntry = ObjectEntryShared<{
  type: "seat";
  seatNumber: number;
}>;

export type SLEntry = TableEntry | SeatEntry;

/**
 * e.g [
 *  {rowIndex: 0, colIndex: 0 },
 *  {rowIndex: 3, colIndex: 2 },
 *  {rowIndex: 4, colIndex: 4 },
 *  {rowIndex: 0, colIndex: 1 },
 * ] => [
 *  {rowIndex: 0, colIndex: 0 },
 *  {rowIndex: 0, colIndex: 1 },
 *  {rowIndex: 3, colIndex: 2 },
 *  {rowIndex: 4, colIndex: 4 },
 * ]
 * @param dimensions An array of positions to be ordered.
 * @returns An array of objects, each containing the original position and its new order.
 */
export function orderCells(
  dimensions: Position[], // Changed type from Position to Position[] to match the example in the JSDoc
): { position: Position; order: number }[] {
  // Create a shallow copy to avoid modifying the original array
  const sortedPositions = [...dimensions].sort((a, b) => {
    // Primary sort by rowIndex
    if (a.rowIndex !== b.rowIndex) {
      return a.rowIndex - b.rowIndex;
    }
    // Secondary sort by colIndex if rowIndex is the same
    return a.colIndex - b.colIndex;
  });

  // Map the sorted positions to the desired output format, assigning order based on index
  return sortedPositions.map((pos, index) => ({
    position: pos,
    order: index,
  }));
}

export const get_pos_key = (cell: Position) =>
  [cell.rowIndex, cell.colIndex].join(",");

/**
 * assign a sequential seatNumber based on the X,Y position for the entry on the matrix
 * @param cells_
 * @returns
 */
export function reorderSeats(cells_: SLEntry[]) {
  const cells = structuredClone(cells_);

  const positions = cells
    .filter((e) => e.type === "seat")
    .map((e) => e.position);

  const reorder = new Map(
    orderCells(positions).map(
      (c) => [get_pos_key(c.position), c.order] as const,
    ),
  );

  for (const cell of cells) {
    const main_key = get_pos_key(cell.position);

    if (cell.type !== "seat") {
      continue;
    }

    const seat_order = reorder.get(main_key);

    if (isNullable(seat_order)) continue;

    if (Number.isInteger(seat_order)) {
      cell.seatNumber = seat_order + 1;
    }
  }

  return cells;
}
