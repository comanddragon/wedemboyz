"use client";

import { cn } from "@/lib/utils";

export interface DateRange {
  start: string; // ISO date
  end: string; // ISO date
}

export type DateRangePresetKey = "7d" | "30d" | "month" | "year" | "custom";

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Computes the start/end ISO dates for a named preset, anchored on today. */
export function rangeForPreset(preset: Exclude<DateRangePresetKey, "custom">): DateRange {
  const today = new Date();
  const end = toIsoDate(today);

  if (preset === "7d") {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    return { start: toIsoDate(start), end };
  }
  if (preset === "30d") {
    const start = new Date(today);
    start.setDate(start.getDate() - 29);
    return { start: toIsoDate(start), end };
  }
  if (preset === "month") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { start: toIsoDate(start), end };
  }
  // year
  const start = new Date(today.getFullYear(), 0, 1);
  return { start: toIsoDate(start), end };
}

const PRESETS: { value: Exclude<DateRangePresetKey, "custom">; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "month", label: "This month" },
  { value: "year", label: "This year" },
];

export function DateRangePicker({
  preset,
  onPresetChange,
}: {
  preset: DateRangePresetKey;
  onPresetChange: (preset: Exclude<DateRangePresetKey, "custom">) => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-crease bg-white p-0.5">
      {PRESETS.map((p) => (
        <button
          key={p.value}
          type="button"
          onClick={() => onPresetChange(p.value)}
          className={cn(
            "rounded px-3 py-1.5 text-xs font-medium transition-colors",
            preset === p.value ? "bg-navy text-white" : "text-ink-muted hover:text-ink",
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
