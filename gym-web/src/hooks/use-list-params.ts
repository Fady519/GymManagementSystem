"use client";

import { useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";

type ParamValue = string | number | boolean | null | undefined;

/**
 * Keeps a list page's state (page, sorting, search, filters) in the URL instead of in useState.
 * Why: the link can be shared or bookmarked, a reload keeps the same view, and opening a row
 * then pressing Back returns to the exact same page and filters.
 *
 * Usage:
 *   const params = useListParams();
 *   const page = params.number("page", 1);
 *   params.set({ search: "ali" });        // also goes back to page 1
 *   params.set({ page: 3 });              // only changes the page
 *
 * Must be used under a <Suspense> boundary (Next.js rule for useSearchParams).
 */
export function useListParams() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const string = useCallback(
    (key: string, fallback = ""): string => searchParams.get(key) ?? fallback,
    [searchParams],
  );

  const number = useCallback(
    (key: string, fallback: number): number => {
      const value = Number(searchParams.get(key));
      return Number.isInteger(value) && value > 0 ? value : fallback;
    },
    [searchParams],
  );

  /**
   * Changes some params and keeps the others. null / "" / undefined removes a param,
   * so default values don't clutter the URL. Changing anything except "page" resets
   * the page to 1, because page 5 of the old filter may not exist in the new one.
   */
  const set = useCallback(
    (patch: Record<string, ParamValue>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === undefined || value === "") next.delete(key);
        else next.set(key, String(value));
      }
      if (!("page" in patch)) next.delete("page");
      if (next.get("page") === "1") next.delete("page");

      const query = next.toString();
      // replace (not push) so typing in the search box doesn't add one history entry per letter.
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return { string, number, set };
}

/** The page sizes the tables offer. The API allows up to 100. */
export const PAGE_SIZES = [10, 20, 50] as const;

/** The page size from the URL, or the default when it's missing or not one we offer. */
export function pageSizeFrom(params: ReturnType<typeof useListParams>, fallback: number): number {
  const value = params.number("pageSize", fallback);
  return (PAGE_SIZES as readonly number[]).includes(value) ? value : fallback;
}

/**
 * If the current page became empty (e.g. the last row on the last page was deleted, or the URL
 * says page 9 of 3), go to the last page that has rows instead of showing "nothing here".
 */
export function useClampPage(
  result: { items: unknown[]; totalCount: number; totalPages: number } | undefined,
  page: number,
  setPage: (page: number) => void,
) {
  useEffect(() => {
    if (result && result.items.length === 0 && result.totalCount > 0 && page > 1) {
      setPage(result.totalPages);
    }
  }, [result, page, setPage]);
}
