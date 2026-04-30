import { safeNum } from "@/lib/data.helpers";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu";
import { setTime } from "effect/TestClock";
import { Grid2X2Icon, RotateCcw, RotateCw, XIcon } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import React from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Switch } from "./ui/switch";

const Control: {
  lastIndex: Position;
  lastEl: null | HTMLElement;
  selected: null | Position;
  clearSelection(): void;
} = {
  lastIndex: { rowIndex: 0, colIndex: 0 },
  lastEl: null,
  selected: { rowIndex: 0, colIndex: 0 },
  clearSelection() {
    const fill = document.querySelectorAll("#grid-guide [data-index]");
    for (const e of fill) {
      if (e) e.dataset.active = "false";
    }

    Control.selected = null;
  },
};

type Position = { rowIndex: number; colIndex: number };
type ObjectEntry = { type: string; index: string; position: Position };

window.Control = Control;

const COLUMN_COUNT = 10;
const ROW_COUNT = 3;

export function SeatStructureGrid() {
  const [seats, setSeats] = React.useState<ObjectEntry[]>([]);
  const [edit, setEdit] = React.useState<boolean>(false);

  const [rowCount, setRowCount] = React.useState<number>(ROW_COUNT);
  const [columnCount, setColumnCount] = React.useState<number>(COLUMN_COUNT);

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
      if (Control.selected === null) {
        return toast.error("Please select a cell first");
      }

      const position = { ...Control.selected };

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
        if (!Control.selected) {
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

      <div className="relative">
        <div
          id="grid-guide"
          className={cn(
            "opacity-0 grid top-0 absolute pointer-events-none z-20 gap-1 text-[10px] w-full max-w-md",
            {
              "opacity-25 pointer-events-auto": edit,
            },
          )}
          style={grid_style}
        >
          {table_.map((e) => {
            return (
              <div
                key={`${e.rowIndex}-${e.colIndex}`}
                data-index={`${e.rowIndex},${e.colIndex}`}
                className="bg-gray-400 hover:bg-cyan-500 cursor-pointer data-[active=true]:bg-blue-500 aspect-square w-full rounded-sm"
                onKeyDown={() => { }}
                onDoubleClick={() => {
                  remove(e);
                }}
                onClick={(event) => {
                  Control.clearSelection();

                  Control.selected = e;
                  Control.lastEl = event.target;

                  if (Control.lastEl) {
                    Control.lastEl.dataset.active = "true";
                  }
                }}
              />
            );
          })}
        </div>

        <div
          className="grid gap-1 text-[10px] w-full max-w-md"
          style={grid_style}
        >
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
    horizontal: "col-span-4 row-span-2",
    vertical: "col-span-2 row-span-4",
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
