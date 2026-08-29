"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import type {
  PersistedClient,
  Persister,
} from "@tanstack/react-query-persist-client";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { Either } from "effect";
import type { ReactNode } from "react";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 60 * 24,
    },
  },
});

const LS_KEY = "inspace:queries";

const localStoragePersister: Persister = {
  persistClient: async (client: PersistedClient) => {
    localStorage.setItem(LS_KEY, JSON.stringify(client));
  },

  restoreClient: async () => {
    const raw = localStorage.getItem(LS_KEY);
    const output = Either.try(
      () => JSON.parse(raw as string) as PersistedClient,
    );

    return Either.match(output, {
      onRight: (parsed) => parsed,
      onLeft: () => undefined,
    });
  },

  removeClient: async () => {
    localStorage.removeItem(LS_KEY);
  },
};

if (typeof window !== "undefined") {
  persistQueryClient({
    queryClient,
    persister: localStoragePersister,
    maxAge: 1000 * 60 * 60 * 24,
  });
}

export function QueryProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
