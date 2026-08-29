import { usePaginatedQuery, useQuery } from "convex/react";
import type { FunctionReference } from "convex/server";
import { getFunctionName } from "convex/server";
import { isEqual, serialize } from "ohash";
import { useEffect } from "react";
import { queryClient } from "@/components/react-query";

const paginatedStatusCache = new Map<string, string>();

const makeKey = function makeKey(
  query: FunctionReference<"query">,
  args?: unknown,
): string {
  return `${getFunctionName(query)}::${serialize(args ?? {})}`;
};

export function useCachedQuery<Q extends FunctionReference<"query", "public">>(
  query: Q,
  args?: Omit<Q["_args"], "paginationOpts">,
): Q["_returnType"] | undefined {
  const key = makeKey(query, args);
  const result = useQuery(query, args as any);

  useEffect(() => {
    if (result !== undefined) {
      queryClient.setQueryData([key], result, { updatedAt: Date.now() });
    }
  }, [result, key]);

  const cached = queryClient.getQueryData([key]) as
    | Q["_returnType"]
    | undefined;

  if (result === undefined && cached !== undefined) {
    return cached;
  }

  if (result !== undefined && cached !== undefined && isEqual(result, cached)) {
    return cached;
  }

  return result;
}

type PaginatedResult<T> = {
  results: T[];
  status: "LoadingFirstPage" | "CanLoadMore" | "Exhausted" | "LoadingMore";
  isLoading: boolean;
  loadMore: (numItems: number) => void;
};

export function useCachedPaginatedQuery(
  query: FunctionReference<"query", "public">,
  args: Record<string, unknown>,
  opts: { initialNumItems: number },
): PaginatedResult<any> {
  const key = makeKey(query, args);
  const result = usePaginatedQuery(query, args as any, opts);

  type ResultType = typeof result;

  useEffect(() => {
    if (result.results.length > 0) {
      queryClient.setQueryData([key], result, { updatedAt: Date.now() });
    }
  }, [key, result]);

  const cached = queryClient.getQueryData([key]) as ResultType | undefined;

  if (result.results.length === 0 && cached && cached.results.length > 0) {
    return {
      ...result,
      results: cached.results,
      isLoading: false,
      status: (paginatedStatusCache.get(key) ??
        "LoadingMore") as ResultType["status"],
    };
  }

  if (result.results.length > 0 && cached && isEqual(result.results, cached)) {
    return { ...result, results: cached.results };
  }

  return result;
}
