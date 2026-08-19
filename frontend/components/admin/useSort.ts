"use client";

import { useMemo, useState } from "react";

type Direction = "asc" | "desc";

/**
 * Client-side sort for the rows currently on screen (one page of a
 * server-paginated list). Sorting only ever applies within the loaded page —
 * it doesn't reach across pages, since the list endpoints don't support a
 * server-side `ordering` param.
 */
export function useSort<T, K extends string>(rows: T[] | undefined, getValue: (row: T, key: K) => string | number) {
  const [sortKey, setSortKey] = useState<K | null>(null);
  const [direction, setDirection] = useState<Direction>("asc");

  const toggle = (key: K) => {
    if (sortKey !== key) {
      setSortKey(key);
      setDirection("asc");
    } else if (direction === "asc") {
      setDirection("desc");
    } else {
      setSortKey(null);
    }
  };

  const sorted = useMemo(() => {
    if (!rows) return rows;
    if (!sortKey) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const va = getValue(a, sortKey);
      const vb = getValue(b, sortKey);
      const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
      return direction === "asc" ? cmp : -cmp;
    });
    return copy;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sortKey, direction]);

  return {
    sorted,
    sortKey,
    direction,
    toggle,
    directionFor: (key: K) => (sortKey === key ? direction : null),
  };
}
