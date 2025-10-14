"use client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  addDays,
  addMonths,
  addYears,
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronDown } from "lucide-react";
import React from "react";

const DateRangeContext = React.createContext<{
  filter: FilterOption;
  options: FilterOption[];
  setFilter: (filter: FilterOption) => void;
} | null>(null);

function Provider(props: {
  children: React.ReactNode;
  value?: "month" | "week";
  filters?: FilterOption[];
}) {
  const options = props.filters ?? filters;
  const { filter, setFilter } = useFilter(options, props.value);

  return (
    <DateRangeContext.Provider value={{ filter, setFilter, options }}>
      {props.children}
    </DateRangeContext.Provider>
  );
}

function Dropdown() {
  const ctx = React.useContext(DateRangeContext);

  if (!ctx) {
    throw new Error("useDateRange must be used within a DateRangeProvider");
  }

  return <RangeDropdown value={ctx.filter} onChange={ctx.setFilter} />;
}

function useState() {
  const ctx = React.useContext(DateRangeContext);

  if (!ctx) {
    throw new Error("useDateRange must be used within a DateRangeProvider");
  }

  return ctx;
}

function RangeDropdown(props: {
  value: FilterOption;
  onChange: (filter: FilterOption) => void;
}) {
  const { options } = DateRange.useState();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground focus:outline-none hover:underline focus:text-primary">
          <span>{props.value.label} </span>
          <ChevronDown size="1em" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          {options.map((filter) => {
            return (
              <DropdownMenuItem
                key={filter.label}
                className="text-xs"
                onClick={() => {
                  props.onChange(filter);
                }}
              >
                {filter.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

type FilterOption = {
  key: string;
  label: string;
  get_range: (date: Date | number) => [Date, Date];
};

const filters = [
  {
    key: "week",
    label: "Last 7 days",
    get_range: (today) => {
      const start = startOfWeek(today);
      const end = endOfWeek(today);

      return [start, end];
    },
  },
  {
    key: "month",
    label: "This Month",
    get_range: (today) => {
      const start = startOfMonth(today);
      const end = endOfMonth(today);
      return [start, end];
    },
  },
  {
    key: "last_month",
    label: "Last Month",
    get_range: (today) => {
      const date_ = addDays(startOfMonth(today), -1);
      const start = date_;
      const end = endOfMonth(today);

      return [start, end];
    },
  },
  {
    key: "last_3_month",
    label: "Last 3 months",
    get_range: (today) => {
      const date_ = addMonths(today, -3);
      const start = startOfMonth(date_);
      const end = endOfMonth(today);

      return [start, end];
    },
  },
  {
    key: "last_6_month",
    label: "Last 6 months",
    get_range: (today) => {
      const date_ = addMonths(today, -6);
      const start = startOfMonth(date_);
      const end = endOfMonth(today);

      return [start, end];
    },
  },
  {
    key: "last_year",
    label: "Last Year",
    get_range: (today) => {
      const start = addYears(today, -1);
      const end_date = new Date();

      return [start, end_date];
    },
  },
] as const satisfies FilterOption[];

function useFilter(
  filters: FilterOption[],
  filter_key: "month" | "week" = "month",
) {
  const [filter, setFilter] = React.useState(() => {
    return filters.find((e) => e.key === filter_key) ?? filters[0];
  });

  return { filter, setFilter, options: filters };
}

export const DateRange = {
  Provider,
  Dropdown,
  useState,
  filters,
};
