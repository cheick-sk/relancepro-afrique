"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, DollarSign } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useState } from "react";

interface RevenueData {
  month: string;
  revenue: number;
  predicted?: number;
}

interface RevenueChartProps {
  data: RevenueData[];
  loading?: boolean;
  currency?: string;
  showPrediction?: boolean;
}

const chartConfig = {
  revenue: {
    label: "Revenus",
    color: "hsl(24, 95%, 53%)", // Orange
  },
  predicted: {
    label: "Prévision",
    color: "hsl(142, 76%, 36%)", // Green
  },
} satisfies ChartConfig;

export function RevenueChart({
  data,
  loading,
  currency = "GNF",
  showPrediction = true,
}: RevenueChartProps) {
  const [chartType, setChartType] = useState<"bar" | "line">("bar");

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-orange-500" />
            Revenus Mensuels
          </CardTitle>
          <CardDescription>Évolution des revenus</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
  const totalPredicted = data.reduce((sum, item) => sum + (item.predicted || 0), 0);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M ${currency}`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}k ${currency}`;
    }
    return `${value} ${currency}`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-orange-500" />
              Revenus Mensuels
            </CardTitle>
            <CardDescription>Évolution des revenus sur la période</CardDescription>
          </div>
          <ToggleGroup
            type="single"
            value={chartType}
            onValueChange={(value) => value && setChartType(value as "bar" | "line")}
            className="border rounded-lg p-1"
          >
            <ToggleGroupItem value="bar" className="text-xs px-3">
              Barres
            </ToggleGroupItem>
            <ToggleGroupItem value="line" className="text-xs px-3">
              Ligne
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Revenus</span>
            </div>
            <p className="text-2xl font-bold text-orange-600">
              {formatCurrency(totalRevenue)}
            </p>
          </div>
          {showPrediction && totalPredicted > 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Prévisionnel</span>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(totalPredicted)}
              </p>
            </div>
          )}
        </div>

        {/* Chart */}
        <div className="h-[300px]">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <ResponsiveContainer>
              <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(24, 95%, 53%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(24, 95%, 53%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  className="text-xs"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  className="text-xs"
                  tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
                />
                <Tooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => [
                        formatCurrency(value as number),
                        name === "revenue" ? "Revenus" : "Prévision",
                      ]}
                    />
                  }
                />
                <Legend
                  formatter={(value) => (
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {value === "revenue" ? "Revenus" : "Prévision"}
                    </span>
                  )}
                />
                {chartType === "bar" ? (
                  <>
                    <Bar
                      dataKey="revenue"
                      fill="hsl(24, 95%, 53%)"
                      radius={[4, 4, 0, 0]}
                      barSize={24}
                    />
                    {showPrediction && (
                      <Bar
                        dataKey="predicted"
                        fill="hsl(142, 76%, 36%)"
                        radius={[4, 4, 0, 0]}
                        barSize={24}
                        opacity={0.6}
                      />
                    )}
                  </>
                ) : (
                  <>
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(24, 95%, 53%)"
                      strokeWidth={3}
                      dot={{ fill: "hsl(24, 95%, 53%)", strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, strokeWidth: 2 }}
                    />
                    {showPrediction && (
                      <Line
                        type="monotone"
                        dataKey="predicted"
                        stroke="hsl(142, 76%, 36%)"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={{ fill: "hsl(142, 76%, 36%)", strokeWidth: 2, r: 3 }}
                      />
                    )}
                  </>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
