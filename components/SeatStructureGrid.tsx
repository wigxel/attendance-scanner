import { useLocalStorage } from "@/hooks/use-local-storage";
import { safeNum } from "@/lib/data.helpers";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu";
import { Grid2X2Icon, RotateCcw, RotateCw } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import React from "react";
import useEvent from "react-use-event-hook";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Switch } from "./ui/switch";
type Position = { rowIndex: number; colIndex: number };
type ObjectEntry = { type: string; index: string; position: Position };

// Define the shape of the data stored within the Control object
interface ControlData {
  lastIndex: Position;
  lastEl: null | HTMLElement;
  selected: null | Position;
  dragging: boolean;
  startPos: Position;
  endPos: Position;
  highlighted: Position[];
}

const Control = {
  // All state/data properties are now consolidated under _data
  _data: {
    lastIndex: { rowIndex: 0, colIndex: 0 },
    lastEl: null,
    selected: null,
    // multiple selection state
    dragging: false,
    highlighted: [],
    startPos: { rowIndex: 0, colIndex: 0 },
    endPos: { rowIndex: 0, colIndex: 0 },
  } as ControlData,

  select(e: Position, event: React.MouseEvent<HTMLElement>) {
    Control.clearSelection();

    Control._data.selected = e;
    Control._data.lastEl = event.target as HTMLElement; // Cast to HTMLElement for dataset access

    if (Control._data.lastEl) {
      Control._data.lastEl.dataset.active = "true";
    }
  },

  clearSelection() {
    const fill = document.querySelectorAll("#grid-guide [data-index]");
    for (const el of fill) {
      // Renamed 'e' to 'el' for clarity
      if (el instanceof HTMLElement) {
        // Type guard to ensure 'el' is HTMLElement
        el.dataset.active = "false";
        el.dataset.selected = "false";
      }
    }

    Control._data.selected = null;
  },

  getEl(cell: Position): HTMLElement | null {
    return document.querySelector(
      `#grid-guide [data-index="${cell.rowIndex},${cell.colIndex}"]`,
    );
  },

  highlight(cell: Position) {
    const el = Control.getEl(cell);

    if (el) {
      el.dataset.selected = "true";
    }
  },

  highlightBounds(startPos: Position, endPos: Position) {
    Control.clearSelection(); // Clear previous highlights to show only current selection range
    const hlighs = runBounds(startPos, endPos);
    Control._data.highlighted = [...hlighs];

    for (const cell of hlighs) {
      Control.highlight(cell);
    }
  },

  mouseUp(e: Position, event: React.MouseEvent<HTMLElement>) {
    if (Control._data.dragging) {
      // Only process if a drag was initiated
      Control._data.dragging = false;
      Control._data.endPos = e;

      Control.highlightBounds(Control._data.startPos, Control._data.endPos);
    }
  },

  mouseOver(e: Position, event: React.MouseEvent<HTMLElement>) {
    if (Control._data.dragging) {
      Control.highlightBounds(Control._data.startPos, e);
    }
  },

  mouseDown(e: Position, event: React.MouseEvent<HTMLElement>) {
    Control._data.dragging = true;
    Control._data.startPos = e;
    Control.clearSelection(); // Clear any existing selections when starting a new drag
  },
};

function runBounds(start: Position, end: Position): Position[] {
  const minRow = Math.min(start.rowIndex, end.rowIndex);
  const maxRow = Math.max(start.rowIndex, end.rowIndex);
  const minCol = Math.min(start.colIndex, end.colIndex);
  const maxCol = Math.max(start.colIndex, end.colIndex);

  const highlightedCells: Position[] = [];

  for (let rowIndex = minRow; rowIndex <= maxRow; rowIndex++) {
    for (let colIndex = minCol; colIndex <= maxCol; colIndex++) {
      highlightedCells.push({ rowIndex, colIndex });
    }
  }

  return highlightedCells;
}

const COLUMN_COUNT = 10;
const ROW_COUNT = 3;

export function SeatStructureGrid() {
  const [seats, setSeats] = useLocalStorage<ObjectEntry[]>('seat_config', []);
  const [edit, setEdit] = React.useState<boolean>(false);

  const [rowCount, setRowCount] = useLocalStorage<number>("seat_config_row", ROW_COUNT);
  const [columnCount, setColumnCount] = useLocalStorage<number>("seat_config_column", COLUMN_COUNT);

  const grid_style = {
    gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${rowCount}, minmax(0, 1fr))`,
  };

  const table_ = React.useMemo(
    () => generateMatrix(rowCount, columnCount).flat(),
    [rowCount, columnCount],
  );

  const add = React.useMemo(
    () => (type: "seat" | "table") => () => {
      if (Control._data.selected === null) {
        // Access selected from _data
        return toast.error("Please select a cell first");
      }

      const position = { ...Control._data.selected }; // Access selected from _data

      setSeats((e) => [
        ...e,
        {
          type,
          index: String(e.length),
          position,
        },
      ]);
      setTimeout(() => {
        Control.clearSelection();
      }, 16);
    },
    [],
  );

  const remove = React.useMemo(
    () =>
      ({ rowIndex, colIndex }: Position) => {
        if (!Control._data.selected) {
          // Access selected from _data
          return toast.error("Please select a cell first");
        }

        setSeats((currentSeats) => {
          const initialLength = currentSeats.length;
          const filteredSeats = currentSeats.filter(
            (item) =>
              item.position.rowIndex !== rowIndex ||
              item.position.colIndex !== colIndex,
          );

          if (filteredSeats.length < initialLength) {
            toast.success("Item removed successfully!");
          }

          return filteredSeats;
        });

        setTimeout(() => {
          Control.clearSelection();
        }, 16);
      },
    [],
  );

  const moveSelection = (
    pos: Position,
    event: React.KeyboardEvent<HTMLElement>,
  ) => {
    let { rowIndex, colIndex } = pos;

    let updated = false;

    switch (event.key) {
      case "ArrowUp":
        rowIndex = Math.max(0, rowIndex - 1);
        updated = true;
        break;
      case "ArrowDown":
        rowIndex = Math.min(rowCount - 1, rowIndex + 1);
        updated = true;
        break;
      case "ArrowLeft":
        colIndex = Math.max(0, colIndex - 1);
        updated = true;
        break;
      case "ArrowRight":
        colIndex = Math.min(columnCount - 1, colIndex + 1);
        updated = true;
        break;
      case "Escape": // Optional: Clear selection on Escape key
        Control.clearSelection();
        break;
      default:
        break;
    }

    if (updated) {
      event.preventDefault(); // Prevent default browser scroll behavior for arrow keys
      return { rowIndex, colIndex };
    }

    return null;
  };

  const handleKeyDown = useEvent((event: KeyboardEvent) => {
    // Only enable keyboard navigation if in edit mode
    if (!edit) {
      return;
    }

    const h = Control._data.highlighted;
    if (h.length === 0) return;

    const get_key = (cell: Position) =>
      [cell.rowIndex, cell.colIndex].join(",");

    const newPositionMap = new Map(
      h
        .map((cell) => [get_key(cell), moveSelection(cell, event)])
        .filter((e): e is [string, Position] => e[1] !== null),
    );

    setSeats((seats) => {
      return seats.map((e) => {
        const key = get_key(e.position);

        if (!newPositionMap.has(key)) return e;

        return { ...e, position: newPositionMap.get(key) as Position };
      });
    });

    const new_hs = Array.from(newPositionMap.values());

    Control.clearSelection();
    for (const pos of new_hs) {
      Control.highlight(pos);
    }

    Control._data.highlighted = new_hs;
  });

  React.useEffect(() => {
    const abortController = new AbortController();
    const signal = abortController.signal;

    document.addEventListener("keydown", handleKeyDown, { signal });

    return () => {
      // Clean up the event listener when the component unmounts or dependencies change
      abortController.abort();
    };
  }, [handleKeyDown]); // Re-run effect if grid dimensions or edit mode changes

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex gap-2 items-center justify-between z-40 relative">
        <div className="flex gap-2 items-center">
          <Button onClick={add("seat")}>Add Seats</Button>
          <Button onClick={add("table")}>Add Tables</Button>
        </div>

        <div className="flex gap-2">
          <div className="flex gap-2 items-center uppercase text-xs font-medium">
            Show grid
            <Switch
              checked={edit}
              onCheckedChange={() => {
                setEdit((e) => !e);
              }}
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="w-8 h-8">
                <Grid2X2Icon className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="bg-white max-w-xs py-2 rounded-sm px-2"
            >
              <div className="flex gap-px items-center">
                <Input
                  className="w-16"
                  min="0"
                  type="number"
                  value={rowCount}
                  onChange={(v) =>
                    setRowCount(safeNum(v.target.value, ROW_COUNT))
                  }
                />
                <span className="font-mono px-1">x</span>
                <Input
                  className="w-16"
                  min="0"
                  type="number"
                  value={columnCount}
                  onChange={(v) =>
                    setColumnCount(safeNum(v.target.value, COLUMN_COUNT))
                  }
                />
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div
        className="grid gap-1 text-[10px] w-full max-w-md relative"
        style={grid_style}
      >
        <div
          id="grid-guide"
          className={cn(
            "grid top-0 absolute opacity-0 inset-0 pointer-events-none z-20 gap-1 text-[10px] w-full max-w-md",
            {
              "pointer-events-auto opacity-100": edit,
            },
          )}
          style={grid_style}
        >
          {table_.map((e) => {
            return (
              <div
                key={`${e.rowIndex}-${e.colIndex}`}
                data-index={`${e.rowIndex},${e.colIndex}`}
                className={cn(
                  "opacity-100 border-gray-200/50 border-2 hover:bg-cyan-500/25 cursor-pointer aspect-square w-full rounded-sm",
                  "data-[active=true]:bg-blue-500/25",
                  "data-[selected=true]:bg-pink-500/25!",
                )}
                onKeyDown={() => { }}
                onFocus={() => { }}
                onDoubleClick={() => {
                  remove(e);
                }}
                onMouseUp={(event) => {
                  Control.mouseUp(e, event);
                }}
                onMouseOver={(event) => {
                  Control.mouseOver(e, event);
                }}
                onMouseDown={(event) => {
                  Control.mouseDown(e, event);
                }}
                onClick={(event) => {
                  Control.select(e, event);
                }}
              />
            );
          })}
        </div>

        <div
          id="DO_NOT_REMOVE_IMPORTANT_FOR_GRID_STRUCTURE"
          className="w-full aspect-square"
        />

        {seats.map((e) => {
          const style = e.position
            ? {
              gridColumnStart: `${e.position.colIndex + 1}`,
              gridRowStart: `${e.position.rowIndex + 1}`,
            }
            : {};

          if (e.type === "seat") {
            return (
              <SeatButton
                data-index={e.index}
                count={"1"}
                isBooked={false}
                isSelected={false}
                style={style}
              />
            );
          }

          return (
            <Table
              data-index={e.index}
              key={e.index}
              mode="edit"
              style={style}
            />
          );
        })}
      </div>

      <motion.div
        animate={{ opacity: edit ? 1 : 0, y: edit ? "0" : "-20%" }}
        className="text-xs text-muted-foreground text-center"
      >
        <span className="">Double click</span> to{" "}
        <span className="text-foreground font-medium">remove</span>
      </motion.div>
    </div>
  );
}

function generateMatrix(
  rows: number,
  cols: number,
): { rowIndex: number; colIndex: number }[][] {
  const matrix: { rowIndex: number; colIndex: number }[][] = [];

  for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
    const rowEntries: { rowIndex: number; colIndex: number }[] = [];
    for (let colIndex = 0; colIndex < cols; colIndex++) {
      rowEntries.push({ colIndex, rowIndex });
    }
    matrix.push(rowEntries);
  }

  return matrix;
}

function useToggleOptions<const T>(options: T[]) {
  const [state, setState] = React.useState(options[0]);

  const toggle = () => {
    const currentIndex = options.indexOf(state);
    const nextIndex = (currentIndex + 1) % options.length;

    setState(options[nextIndex]);
  };

  return [state, toggle] as const;
}

const sizeAndRotationClasses = {
  sm: {
    horizontal: "col-span-2 row-span-1",
    vertical: "col-span-1 row-span-2",
  },
  md: {
    horizontal: "col-span-3",
    vertical: "col-span-1 row-span-3",
  },
  lg: {
    horizontal: "col-span-3 row-span-2",
    vertical: "col-span-2 row-span-3",
  },
} as const;

// Table Component
export function Table({
  className = "",
  shape = "rectangle",
  mode,
  ...rest
}: {
  mode: "edit" | "preview";
} & React.ComponentProps<"div">) {
  const shapeClass = shape === "circle" ? "rounded-full" : "rounded-md";
  const [size, toggle] = useToggleOptions(["sm", "md", "lg"]);
  const [rotation, toggleRotate] = useToggleOptions(["horizontal", "vertical"]);
  const specificGridClasses = sizeAndRotationClasses[size][rotation];

  return (
    <div
      className={cn(
        "bg-white group shadow-2xs p-3.5 flex items-items-center justify-center relative",
        shapeClass,
        className,
        specificGridClasses,
      )}
      {...rest}
    >
      <button
        type="button"
        className="absolute cursor-pointer top-0 -translate-y-1/2 rounded-full bg-white shadow z-20 group-hover:opacity-100 opacity-0 text-xs font-medium"
        onClick={() => toggleRotate()}
      >
        {rotation !== "horizontal" ? <RotateCcw /> : <RotateCw />}
      </button>

      {mode === "edit" ? (
        <button
          type="button"
          className="font-mono cursor-pointer text-xs font-medium"
          onClick={() => toggle()}
        >
          {size}
        </button>
      ) : null}
    </div>
  );
}

export function SeatButton(
  props: React.ComponentProps<"button"> & {
    count: string;
    isBooked: boolean;
    isSelected: boolean;
  },
) {
  const { className, count: index, isBooked, isSelected, ...rest } = props;

  const seat_classnames = React.useMemo((): string => {
    const baseStyles =
      "rounded-lg p-1 cursor-pointer transition-all duration-200 flex items-center justify-center text-xs font-medium";

    if (isBooked) {
      return `${baseStyles} text-gray-800 cursor-not-allowed`;
    }

    if (isSelected) {
      return `${baseStyles} bg-[#FFF2CC80] border-[#FF9900] border text-[#FF9900] shadow-lg scale-105`;
    }

    return `${baseStyles} border border-transparent bg-white text-gray-800 hover:bg-gray-300`;
  }, [isBooked, isSelected]);

  return (
    <button
      type="button"
      {...rest}
      className={cn(seat_classnames, className, "relative")}
    >
      {!isBooked ? (
        <motion.span
          animate={
            !isSelected
              ? { translateY: 0, translateX: 0, opacity: 0, scale: 0.25 }
              : {
                scale: 1,
                opacity: 100,
                translateY: "-50%",
                translateX: "-50%",
              }
          }
          className="absolute top-0 left-0 bg-white bg-white p-2 rounded-full size-8"
        >
          {" "}
          {index}{" "}
        </motion.span>
      ) : (
        <span
          className="pointer-events-none absolute inset-0 bg-[url('/images/reserved-bg.png')] rounded-lg"
          style={{ backgroundSize: "60px" }}
        />
      )}

      <Image
        src={"/images/chair.png"}
        alt={`chair #${index}`}
        width={32}
        height={32}
      />
    </button>
  );
}
