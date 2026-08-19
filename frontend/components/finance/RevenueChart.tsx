"use client";

import { BarChart3, LineChart, Table2 } from "lucide-react";
import { useId, useMemo, useState } from "react";

import { TableContainer, TBody, Td, Th, THead, Tr } from "@/components/admin/Table";
import { formatCurrency } from "@/lib/constants";
import type { RevenueAnalyticsPoint } from "@/types";

/**
 * Revenue time series, viewable as a plain table, a bar chart, or a line
 * chart. Both charts are built as plain SVG (no charting library in
 * package.json) — a hover/focus target per bar or point reveals the exact
 * date, revenue, and payment count in a small tooltip above it. A small
 * toggle in the corner switches between the three views; the table is the
 * default since it's the most scannable/exact, with the charts a click away
 * for the shape of things.
 */
export function RevenueChart({
  points,
  period,
}: {
  points: RevenueAnalyticsPoint[];
  period: "daily" | "monthly";
}) {
  const [view, setView] = useState<"table" | "bar" | "line">("table");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const gradientId = useId();

  const width = 720;
  const height = 220;
  const paddingLeft = 8;
  const paddingRight = 8;
  const paddingTop = 16;
  const paddingBottom = 28;
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const maxRevenue = useMemo(() => Math.max(1, ...points.map((p) => p.revenue)), [points]);

  const barGap = 6;
  const barWidth = points.length > 0 ? Math.max(4, chartWidth / points.length - barGap) : 0;
  // Same slot pitch as the bars, so a given date lands at the same x whether
  // you're looking at the bar chart or the line chart.
  const slotCenterX = (i: number) => paddingLeft + i * (barWidth + barGap) + barWidth / 2;
  const valueY = (revenue: number) => height - paddingBottom - (revenue / maxRevenue) * chartHeight;

  const formatLabel = (date: string) => {
    if (period === "monthly") {
      const [year, month] = date.split("-");
      return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString(undefined, {
        month: "short",
        year: "2-digit",
      });
    }
    return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  if (points.length === 0) {
    return <p className="py-16 text-center text-sm text-ink-muted">No revenue in this range yet.</p>;
  }

  // Show every label if there are few bars, otherwise thin them out so text doesn't overlap.
  const labelStride = Math.max(1, Math.ceil(points.length / 10));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${slotCenterX(i)},${valueY(p.revenue)}`).join(" ");
  const areaPath =
    `M${slotCenterX(0)},${height - paddingBottom} ` +
    points.map((p, i) => `L${slotCenterX(i)},${valueY(p.revenue)}`).join(" ") +
    ` L${slotCenterX(points.length - 1)},${height - paddingBottom} Z`;

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <div className="inline-flex rounded-md border border-crease bg-white p-0.5">
          {(
            [
              { key: "table", label: "Table", Icon: Table2 },
              { key: "bar", label: "Bar", Icon: BarChart3 },
              { key: "line", label: "Line", Icon: LineChart },
            ] as const
          ).map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              aria-pressed={view === key}
              className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                view === key ? "bg-navy text-white" : "text-ink-muted hover:text-ink"
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {view === "table" && (
        <TableContainer>
          <THead>
            <Th>{period === "monthly" ? "Month" : "Date"}</Th>
            <Th align="right">Revenue</Th>
            <Th align="right">Payments</Th>
          </THead>
          <TBody>
            {points.map((p) => (
              <Tr key={p.date}>
                <Td className="whitespace-nowrap">{formatLabel(p.date)}</Td>
                <Td align="right" className="tabular-nums">
                  {formatCurrency(p.revenue)}
                </Td>
                <Td align="right" className="tabular-nums text-ink-muted">
                  {p.payment_count}
                </Td>
              </Tr>
            ))}
          </TBody>
        </TableContainer>
      )}

      {view === "bar" && (
        <div className="relative">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full"
            role="img"
            aria-label={`Revenue by ${period === "monthly" ? "month" : "day"}`}
          >
            {/* baseline */}
            <line
              x1={paddingLeft}
              y1={height - paddingBottom}
              x2={width - paddingRight}
              y2={height - paddingBottom}
              stroke="var(--color-crease, #D8DCE2)"
              strokeWidth={1}
            />
            {points.map((p, i) => {
              const barHeight = (p.revenue / maxRevenue) * chartHeight;
              const x = paddingLeft + i * (barWidth + barGap);
              const y = height - paddingBottom - barHeight;
              const isActive = activeIndex === i;

              return (
                <g key={p.date}>
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={Math.max(barHeight, p.revenue > 0 ? 2 : 0)}
                    rx={2}
                    fill={isActive ? "var(--color-gold, #C8922F)" : "var(--color-navy, #192645)"}
                    opacity={isActive ? 1 : 0.85}
                    className="transition-[opacity,fill] duration-150"
                    onMouseEnter={() => setActiveIndex(i)}
                    onMouseLeave={() => setActiveIndex((cur) => (cur === i ? null : cur))}
                    onFocus={() => setActiveIndex(i)}
                    onBlur={() => setActiveIndex((cur) => (cur === i ? null : cur))}
                    tabIndex={0}
                    role="graphics-symbol"
                    aria-label={`${formatLabel(p.date)}: ${formatCurrency(p.revenue)}, ${p.payment_count} payment${p.payment_count === 1 ? "" : "s"}`}
                  />
                  {i % labelStride === 0 && (
                    <text
                      x={x + barWidth / 2}
                      y={height - paddingBottom + 16}
                      textAnchor="middle"
                      fontSize={10}
                      fill="var(--color-ink-muted, #6B7280)"
                    >
                      {formatLabel(p.date)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {activeIndex !== null && points[activeIndex] && (
            <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full rounded-md border border-crease bg-white px-3 py-1.5 text-xs shadow-sm">
              <p className="font-medium text-ink">{formatLabel(points[activeIndex].date)}</p>
              <p className="text-ink-muted">
                {formatCurrency(points[activeIndex].revenue)} · {points[activeIndex].payment_count} payment
                {points[activeIndex].payment_count === 1 ? "" : "s"}
              </p>
            </div>
          )}
        </div>
      )}

      {view === "line" && (
        <div className="relative">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full"
            role="img"
            aria-label={`Revenue by ${period === "monthly" ? "month" : "day"}`}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-navy, #192645)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--color-navy, #192645)" stopOpacity={0} />
              </linearGradient>
            </defs>

            {/* baseline */}
            <line
              x1={paddingLeft}
              y1={height - paddingBottom}
              x2={width - paddingRight}
              y2={height - paddingBottom}
              stroke="var(--color-crease, #D8DCE2)"
              strokeWidth={1}
            />

            <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
            <path
              d={linePath}
              fill="none"
              stroke="var(--color-gold, #C8922F)"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {points.map((p, i) => {
              const x = slotCenterX(i);
              const y = valueY(p.revenue);
              const isActive = activeIndex === i;

              return (
                <g key={p.date}>
                  {/* wide invisible hit target so short gaps between points are still hoverable */}
                  <rect
                    x={x - (barWidth + barGap) / 2}
                    y={paddingTop}
                    width={barWidth + barGap}
                    height={chartHeight}
                    fill="transparent"
                    onMouseEnter={() => setActiveIndex(i)}
                    onMouseLeave={() => setActiveIndex((cur) => (cur === i ? null : cur))}
                    onFocus={() => setActiveIndex(i)}
                    onBlur={() => setActiveIndex((cur) => (cur === i ? null : cur))}
                    tabIndex={0}
                    role="graphics-symbol"
                    aria-label={`${formatLabel(p.date)}: ${formatCurrency(p.revenue)}, ${p.payment_count} payment${p.payment_count === 1 ? "" : "s"}`}
                  />
                  <circle
                    cx={x}
                    cy={y}
                    r={isActive ? 5 : 3}
                    fill={isActive ? "var(--color-gold, #C8922F)" : "var(--color-navy, #192645)"}
                    stroke="white"
                    strokeWidth={1.5}
                    className="pointer-events-none transition-[r,fill] duration-150"
                  />
                  {i % labelStride === 0 && (
                    <text
                      x={x}
                      y={height - paddingBottom + 16}
                      textAnchor="middle"
                      fontSize={10}
                      fill="var(--color-ink-muted, #6B7280)"
                    >
                      {formatLabel(p.date)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {activeIndex !== null && points[activeIndex] && (
            <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full rounded-md border border-crease bg-white px-3 py-1.5 text-xs shadow-sm">
              <p className="font-medium text-ink">{formatLabel(points[activeIndex].date)}</p>
              <p className="text-ink-muted">
                {formatCurrency(points[activeIndex].revenue)} · {points[activeIndex].payment_count} payment
                {points[activeIndex].payment_count === 1 ? "" : "s"}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
