"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
  ComposedChart,
  Bar,
} from "recharts";
import { formatCurrency } from "@/lib/analytics/calculations";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CalendarDays, TrendingUp } from "lucide-react";

export interface RevenueData {
  period: string;
  revenue: number;
  previousRevenue?: number;
  count?: number;
}

interface RevenueChartProps {
  data: RevenueData[];
  title?: string;
  description?: string;
  loading?: boolean;
  groupBy?: "day" | "week" | "month";
  onGroupByChange?: (groupBy: "day" | "week" | "month") => void;
  showComparison?: boolean;
  currency?: string;
}

const chartConfig = {
  revenue: {
    label: "Revenus",
    color: "#f59e0b",
  },
  previousRevenue: {
    label: "Période précédente",
    color: "#94a3b8",
  },
} satisfies ChartConfig;

export function RevenueChart({
  data,
  title = "Évolution des revenus",
  description = "Revenus au fil du temps",
  loading = false,
  groupBy = "month",
  onGroupByChange,
  showComparison = true,
  currency = "GNF",
}: RevenueChartProps) {
  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {onGroupByChange && (
            <ToggleGroup
              type="single"
              value={groupBy}
              onValueChange={(value) => value && onGroupByChange(value as "day" | "week" | "month")}
              size="sm"
              className="border rounded-lg"
            >
              <ToggleGroupItem value="day" className="text-xs px-3">
                Jour
              </ToggleGroupItem>
              <ToggleGroupItem value="week" className="text-xs px-3">
                Semaine
              </ToggleGroupItem>
              <ToggleGroupItem value="month" className="text-xs px-3">
                Mois
              </ToggleGroupItem>
            </ToggleGroup>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ComposedChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
            <XAxis
              dataKey="period"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              className="text-xs"
              tick={{ fill: "currentColor", opacity: 0.7 }}
            />
            <YAxis
              tickFormatter={(value) => {
                if (value >= 1000000) return `${(value / 1000000).toFixed(0)}M`;
                if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                return value;
              }}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              className="text-xs"
              tick={{ fill: "currentColor", opacity: 0.7 }}
            />
            <ChartTooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;

                return (
                  <div className="rounded-lg border bg-background p-3 shadow-md">
                    <p className="font-medium text-sm mb-2 text-muted-foreground">{label}</p>
                    {payload.map((entry, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-muted-foreground">
                          {entry.name === "revenue" ? "Revenus actuels" : "Période précédente"}:
                        </span>
                        <span className="font-semibold">
                          {formatCurrency(entry.value as number, currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#f59e0b"
              strokeWidth={2}
              fill="url(#colorRevenue)"
              name="revenue"
            />
            {showComparison && data.some(d => d.previousRevenue !== undefined) && (
              <Line
                type="monotone"
                dataKey="previousRevenue"
                stroke="#94a3b8"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="previousRevenue"
              />
            )}
          </ComposedChart>
        </ChartContainer>
        <div className="flex items-center justify-center gap-6 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-4 bg-orange-500" />
            <span>Période actuelle</span>
          </div>
          {showComparison && data.some(d => d.previousRevenue !== undefined) && (
            <div className="flex items-center gap-2">
              <div className="h-0.5 w-4 bg-slate-400 border-dashed border-t-2 border-slate-400" />
              <span>Période précédente</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Simple version without card wrapper
export function RevenueChartSimple({ data, currency = "GNF" }: { data: RevenueData[]; currency?: string }) {
  return (
    <ChartContainer config={chartConfig} className="h-[250px] w-full">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorRevenueSimple" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
        <XAxis dataKey="period" tickLine={false} axisLine={false} />
        <YAxis
          tickFormatter={(value) => {
            if (value >= 1000000) return `${(value / 1000000).toFixed(0)}M`;
            if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
            return value;
          }}
          tickLine={false}
          axisLine={false}
        />
        <ChartTooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            return (
              <div className="rounded-lg border bg-background p-2 shadow-md">
                <p className="font-medium text-sm">{label}</p>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(payload[0].value as number, currency)}
                </p>
              </div>
            );
          }}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#f59e0b"
          strokeWidth={2}
          fill="url(#colorRevenueSimple)"
        />
      </AreaChart>
    </ChartContainer>
  );
}

// Skeleton component
export function RevenueChartSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32 mt-1" />
          </div>
          <Skeleton className="h-8 w-32" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[300px] w-full" />
      </CardContent>
    </Card>
  );
}
