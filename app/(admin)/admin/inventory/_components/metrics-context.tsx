"use client";

import { useQuery } from "convex/react";
import { format, parseISO } from "date-fns";
import { parseAsIsoDate, useQueryStates } from "nuqs";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
} from "react";
import { api } from "@/convex/_generated/api";
import type { InventoryMetrics } from "@/convex/inventory";

export type MetricsRange = { start: string; end: string };

const today = format(new Date(), "yyyy-MM-dd");

const CHANNELS = ["cash", "pos", "transfer", "unrecorded"] as const;

export const EMPTY_METRICS: InventoryMetrics = {
  range: { start: "", end: "" },
  stock: { valueKobo: 0, productCount: 0, lowCount: 0, outCount: 0 },
  spend: { totalKobo: 0, paidKobo: 0, outstandingKobo: 0, purchaseCount: 0 },
  revenue: {
    totalKobo: 0,
    shopKobo: 0,
    salesCount: 0,
    byChannel: CHANNELS.map((channel) => ({
      channel,
      shopKobo: 0,
      totalKobo: 0,
    })),
  },
  margin: { cogsKobo: 0, grossMarginKobo: 0, grossMarginPercent: null },
  movement: [],
  topSales: [],
};

type MetricsContextValue = {
  metrics: InventoryMetrics;
  range: MetricsRange;
  setRange: (range: MetricsRange) => void;
};

const MetricsContext = createContext<MetricsContextValue | null>(null);

export function MetricsProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useQueryStates({
    metrics_from: parseAsIsoDate.withDefault(parseISO(today)),
    metrics_to: parseAsIsoDate.withDefault(parseISO(today)),
  });

  const range = useMemo(
    () => ({
      start: format(query.metrics_from, "yyyy-MM-dd"),
      end: format(query.metrics_to, "yyyy-MM-dd"),
    }),
    [query.metrics_from, query.metrics_to],
  );

  const setRange = useCallback(
    (next: MetricsRange) =>
      setQuery({
        metrics_from: parseISO(next.start),
        metrics_to: parseISO(next.end),
      }),
    [setQuery],
  );

  const data = useQuery(api.inventory.metrics, range);
  const metrics = data ?? EMPTY_METRICS;

  const value = useMemo(
    () => ({ metrics, range, setRange }),
    [metrics, range, setRange],
  );

  return (
    <MetricsContext.Provider value={value}>{children}</MetricsContext.Provider>
  );
}

export function useMetrics() {
  const context = useContext(MetricsContext);

  if (!context) {
    throw new Error("useMetrics must be used within <MetricsProvider>");
  }

  return context;
}
