"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Tabs } from "@/components/ui/Tabs";
import { formatCurrency } from "@/lib/utils";

export interface SalesPoint {
  /** ISO date (yyyy-mm-dd) */
  date: string;
  /** Short label already formatted for display, e.g. "12 أغسطس" */
  label: string;
  revenue: number;
  orders: number;
}

/* Recharts writes these straight onto SVG attributes, where CSS vars do not
   resolve — so the palette below is picked to read well in both themes. */
const AXIS_STYLE = { fontSize: 11, fill: "#94a3b8" };
const GRID_STROKE = "rgba(148, 163, 184, 0.25)";
const CURSOR_FILL = "rgba(148, 163, 184, 0.12)";

function ChartTooltip({
  active,
  payload,
  label,
  metric,
}: {
  active?: boolean;
  payload?: { value?: number | string }[];
  label?: string;
  metric: "revenue" | "orders";
}) {
  if (!active || !payload?.length) return null;
  const value = Number(payload[0]?.value ?? 0);
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 shadow-pop">
      <p className="text-[11px] text-fg-muted">{label}</p>
      <p className="text-sm font-bold tnum text-fg">
        {metric === "revenue" ? formatCurrency(value) : `${value} طلب`}
      </p>
    </div>
  );
}

/**
 * Revenue / order-count trend for the selected period.
 * The X axis is reversed so the timeline reads right-to-left with the page.
 */
export function SalesChart({ data, emptyHint }: { data: SalesPoint[]; emptyHint?: string }) {
  const [metric, setMetric] = useState<"revenue" | "orders">("revenue");
  const hasData = useMemo(() => data.some((d) => d.revenue > 0 || d.orders > 0), [data]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Tabs
          variant="segmented"
          ariaLabel="مقياس الرسم البياني"
          value={metric}
          onChange={(v) => setMetric(v as "revenue" | "orders")}
          items={[
            { value: "revenue", label: "المبيعات" },
            { value: "orders", label: "الطلبات" },
          ]}
        />
      </div>

      {!hasData ? (
        <div className="flex h-56 flex-col items-center justify-center gap-1 rounded-control bg-surface-sunken/60 text-center">
          <p className="text-[13px] font-medium text-fg-muted">لا توجد مبيعات في هذه الفترة</p>
          {emptyHint && <p className="text-xs text-fg-subtle">{emptyHint}</p>}
        </div>
      ) : (
        <div className="h-56 w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            {metric === "revenue" ? (
              <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="label" reversed tick={AXIS_STYLE} tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis
                  orientation="right"
                  tick={AXIS_STYLE}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                  tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
                />
                <RTooltip content={<ChartTooltip metric="revenue" />} cursor={{ stroke: GRID_STROKE }} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#7c3aed"
                  strokeWidth={2}
                  fill="url(#salesFill)"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              </AreaChart>
            ) : (
              <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="label" reversed tick={AXIS_STYLE} tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis orientation="right" tick={AXIS_STYLE} tickLine={false} axisLine={false} width={40} allowDecimals={false} />
                <RTooltip content={<ChartTooltip metric="orders" />} cursor={{ fill: CURSOR_FILL }} />
                <Bar dataKey="orders" fill="#7c3aed" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
