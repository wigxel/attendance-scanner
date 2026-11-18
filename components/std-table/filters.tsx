"use client";

import type { Table as TanStackTable } from "@tanstack/react-table";
import { parseAsStringLiteral, useQueryStates } from "nuqs";
import { FilterDropdown } from "./filter-dropdown";

export type FilterOption = { value: string; label: string };

/**
 * One filterable column. The id doubles as the URL query key unless queryKey
 * overrides it — only needed when two filterable tables share a page.
 */
export type FilterSpec = {
  options: readonly FilterOption[];
  queryKey?: string;
};

/** What a column header needs to render its filter. */
type FilterInstance = {
  value: string | undefined;
  options: readonly FilterOption[];
  onChange: (value: string | undefined) => void;
};

type FilterDefs = Record<string, FilterSpec>;

/** The same instances, with each value typed to its own option union. */
type Filters<D extends FilterDefs> = {
  [K in keyof D]: {
    value: D[K]["options"][number]["value"] | undefined;
    options: D[K]["options"];
    onChange: (value: D[K]["options"][number]["value"] | undefined) => void;
  };
};

/** nuqs parsers for a defs object; the query key is queryKey ?? id. */
export function filterParsers(defs: FilterDefs) {
  return Object.fromEntries(
    Object.entries(defs).map(([id, spec]) => [
      spec.queryKey ?? id,
      parseAsStringLiteral(spec.options.map((option) => option.value)),
    ]),
  );
}

/** Builds the per-id instances a table's column headers read from meta. */
export function buildFilterMeta(
  defs: FilterDefs,
  query: Record<string, string | null>,
  setQuery: (values: Record<string, string | null>) => void,
): Record<string, FilterInstance> {
  return Object.fromEntries(
    Object.entries(defs).map(([id, spec]) => {
      const key = spec.queryKey ?? id;
      return [
        id,
        {
          value: query[key] ?? undefined,
          options: spec.options,
          onChange: (value) => setQuery({ [key]: value ?? null }),
        },
      ];
    }),
  );
}

/**
 * Filter state for a table, URL-backed via nuqs. Declare the filters once and
 * hand the result to <StdTable.Root meta={...}>; column headers render
 * <HeaderFilter table={...} id="..." label="..." />.
 */
export function useTableFilters<D extends FilterDefs>(defs: D): Filters<D> {
  const [query, setQuery] = useQueryStates(
    filterParsers(defs) as Parameters<typeof useQueryStates>[0],
  );
  return buildFilterMeta(
    defs,
    query as Record<string, string | null>,
    setQuery as (values: Record<string, string | null>) => void,
  ) as Filters<D>;
}

type HeaderFilterProps<TData> = {
  table: TanStackTable<TData>;
  id: string;
  label: string;
};

/** A column header with its filter: label plus the funnel dropdown. */
export function HeaderFilter<TData>({
  table,
  id,
  label,
}: HeaderFilterProps<TData>) {
  const filters = table.options.meta as
    | Record<string, FilterInstance>
    | undefined;
  const filter = filters?.[id];

  return (
    <div className="flex items-center gap-1">
      {label}
      {filter ? (
        <FilterDropdown
          value={filter.value}
          options={filter.options}
          onChange={filter.onChange}
        />
      ) : null}
    </div>
  );
}
