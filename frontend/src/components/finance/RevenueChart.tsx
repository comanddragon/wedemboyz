"use client";

import { ArrowDownRight, ArrowUpRight, BarChart3, LineChart, Table2 } from "lucide-react";
import { useId, useMemo, useState } from "react";

import {
  TableContainer,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from "@/src/components/admin/Table";
import { formatCurrency } from "@/src/lib/constants";
import type { RevenueAnalyticsPoint } from "@/src/types";

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
  const [view, setView] = useState<"table" | "bar" | "line">("line");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const gradientId = useId();

  // Keep the dashboard trend wide and shallow so the whole story remains
  // visible without making the analytics page a chart-only viewport.
  const width = 1200;
  const height = 215;
  const paddingLeft = 92;
  const paddingRight = 12;
  const paddingTop = 10;
  const paddingBottom = 30;
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const maxRevenue = useMemo(
    () => Math.max(1, ...points.map((p) => p.revenue)) * 1.08,
    [points],
  );

  const barGap = 8;
  const barWidth =
    points.length > 0 ? Math.max(4, chartWidth / points.length - barGap) : 0;
  // Same slot pitch as the bars, so a given date lands at the same x whether
  // you're looking at the bar chart or the line chart.
  const slotCenterX = (i: number) =>
    paddingLeft + i * (barWidth + barGap) + barWidth / 2;
  const valueY = (revenue: number) =>
    height - paddingBottom - (revenue / maxRevenue) * chartHeight;

  const insights = useMemo(() => {
    const total = points.reduce((sum, point) => sum + point.revenue, 0);
    const peak = points.reduce((best, point) => point.revenue > best.revenue ? point : best, points[0]);
    const first = points[0]?.revenue ?? 0;
    const last = points.at(-1)?.revenue ?? 0;
    const change = first > 0 ? ((last - first) / first) * 100 : null;
    return { total, average: total / Math.max(points.length, 1), peak, change };
  }, [points]);

  const formatLabel = (date: string) => {
    if (period === "monthly") {
      const [year, month] = date.split("-");
      return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString(
        undefined,
        {
          month: "short",
          year: "2-digit",
        },
      );
    }
    return new Date(date).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  if (points.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-ink-muted">
        No revenue in this range yet.
      </p>
    );
  }

  // Show every label if there are few bars, otherwise thin them out so text doesn't overlap.
  const labelStride = Math.max(1, Math.ceil(points.length / 10));

  const linePath = points
    .map(
      (p, i) => `${i === 0 ? "M" : "L"}${slotCenterX(i)},${valueY(p.revenue)}`,
    )
    .join(" ");
  const areaPath =
    `M${slotCenterX(0)},${height - paddingBottom} ` +
    points.map((p, i) => `L${slotCenterX(i)},${valueY(p.revenue)}`).join(" ") +
    ` L${slotCenterX(points.length - 1)},${height - paddingBottom} Z`;

  return (
    <div>
      <div className="mb-3 grid overflow-hidden rounded-xl bg-navy text-white sm:grid-cols-3">
        <div className="px-4 py-2.5"><p className="text-xs text-white/65">Total in view</p><p className="font-display text-base font-semibold tabular-nums">{formatCurrency(insights.total)}</p></div>
        <div className="border-t border-white/10 px-4 py-2.5 sm:border-l sm:border-t-0"><p className="text-xs text-white/65">Average per {period === "daily" ? "day" : "month"}</p><p className="font-display text-base font-semibold tabular-nums">{formatCurrency(insights.average)}</p></div>
        <div className="border-t border-white/10 px-4 py-2.5 sm:border-l sm:border-t-0"><p className="text-xs text-white/65">Period movement</p><p className={`inline-flex items-center gap-1 font-display text-base font-semibold tabular-nums ${insights.change !== null && insights.change < 0 ? "text-coral" : "text-[#57e38d]"}`}>{insights.change === null ? "New" : `${Math.abs(insights.change).toFixed(1)}%`}{insights.change !== null && (insights.change < 0 ? <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" /> : <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />)}</p></div>
      </div>

      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-ink-muted">Peak: <strong className="font-semibold text-revenue-green-dark">{formatCurrency(insights.peak.revenue)}</strong> on {formatLabel(insights.peak.date)}</p>
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
              className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                view === key
                  ? "bg-revenue-green-dark text-white"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              <Icon className="h-3 w-3" aria-hidden="true" />
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
        <div className="relative overflow-x-auto">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="min-w-[720px] w-full"
            role="img"
            aria-label={`Revenue by ${period === "monthly" ? "month" : "day"}`}
          >
            {[0, 0.25, 0.5, 0.75, 1].map((tick) => { const y = height - paddingBottom - tick * chartHeight; return <g key={tick}><line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="var(--color-crease-soft)" strokeWidth={0.75} strokeDasharray={tick === 0 ? undefined : "4 5"} /><text x={paddingLeft - 10} y={y + 3.5} textAnchor="end" fontSize={10} fontWeight={500} fill="var(--color-ink-muted)">{formatCurrency(maxRevenue * tick).replace(" XAF", "")}</text></g>; })}
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
                    fill={
                      isActive
                        ? "var(--color-revenue-green-dark)"
                        : "var(--color-revenue-green)"
                    }
                    opacity={isActive ? 1 : 0.85}
                    className="transition-[opacity,fill] duration-150"
                    onMouseEnter={() => setActiveIndex(i)}
                    onMouseLeave={() =>
                      setActiveIndex((cur) => (cur === i ? null : cur))
                    }
                    onFocus={() => setActiveIndex(i)}
                    onBlur={() =>
                      setActiveIndex((cur) => (cur === i ? null : cur))
                    }
                    tabIndex={0}
                    role="graphics-symbol"
                    aria-label={`${formatLabel(p.date)}: ${formatCurrency(p.revenue)}, ${p.payment_count} payment${p.payment_count === 1 ? "" : "s"}`}
                  />
                  {i % labelStride === 0 && (
                    <text
                      x={x + barWidth / 2}
                      y={height - paddingBottom + 13}
                      textAnchor="middle"
                      fontSize={10}
                      fontWeight={500}
                      fill="var(--color-ink-muted)"
                    >
                      {formatLabel(p.date)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {activeIndex !== null && points[activeIndex] && (
            <div className="pointer-events-none absolute left-1/2 top-1 -translate-x-1/2 rounded-lg bg-navy px-3 py-2 text-xs text-white shadow-float">
              <p className="font-medium text-white">
                {formatLabel(points[activeIndex].date)}
              </p>
              <p className="text-white/70">
                {formatCurrency(points[activeIndex].revenue)} ·{" "}
                {points[activeIndex].payment_count} payment
                {points[activeIndex].payment_count === 1 ? "" : "s"}
              </p>
            </div>
          )}
        </div>
      )}

      {view === "line" && (
        <div className="relative overflow-x-auto">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="min-w-[720px] w-full"
            role="img"
            aria-label={`Revenue by ${period === "monthly" ? "month" : "day"}`}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--color-revenue-green)"
                  stopOpacity={0.38}
                />
                <stop
                  offset="100%"
                  stopColor="var(--color-revenue-green)"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>

            {[0, 0.25, 0.5, 0.75, 1].map((tick) => { const y = height - paddingBottom - tick * chartHeight; return <g key={tick}><line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="var(--color-crease-soft)" strokeWidth={0.75} strokeDasharray={tick === 0 ? undefined : "4 5"} /><text x={paddingLeft - 10} y={y + 3.5} textAnchor="end" fontSize={10} fontWeight={500} fill="var(--color-ink-muted)">{formatCurrency(maxRevenue * tick).replace(" XAF", "")}</text></g>; })}

            <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
            <path
              d={linePath}
              fill="none"
              stroke="var(--color-revenue-green)"
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
                    onMouseLeave={() =>
                      setActiveIndex((cur) => (cur === i ? null : cur))
                    }
                    onFocus={() => setActiveIndex(i)}
                    onBlur={() =>
                      setActiveIndex((cur) => (cur === i ? null : cur))
                    }
                    tabIndex={0}
                    role="graphics-symbol"
                    aria-label={`${formatLabel(p.date)}: ${formatCurrency(p.revenue)}, ${p.payment_count} payment${p.payment_count === 1 ? "" : "s"}`}
                  />
                  <circle
                    cx={x}
                    cy={y}
                    r={isActive ? 3.5 : 2.25}
                    fill={
                      isActive
                        ? "var(--color-revenue-green-dark)"
                        : "var(--color-revenue-green)"
                    }
                    stroke="white"
                    strokeWidth={1.25}
                    className="pointer-events-none transition-[r,fill] duration-150"
                  />
                  {i % labelStride === 0 && (
                    <text
                      x={x}
                      y={height - paddingBottom + 13}
                      textAnchor="middle"
                      fontSize={10}
                      fontWeight={500}
                      fill="var(--color-ink-muted)"
                    >
                      {formatLabel(p.date)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {activeIndex !== null && points[activeIndex] && (
            <div className="pointer-events-none absolute left-1/2 top-1 -translate-x-1/2 rounded-lg bg-navy px-3 py-2 text-xs text-white shadow-float">
              <p className="font-medium text-white">
                {formatLabel(points[activeIndex].date)}
              </p>
              <p className="text-white/70">
                {formatCurrency(points[activeIndex].revenue)} ·{" "}
                {points[activeIndex].payment_count} payment
                {points[activeIndex].payment_count === 1 ? "" : "s"}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
