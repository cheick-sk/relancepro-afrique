"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
} from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, Calendar } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useState } from "react";

interface PaymentTrendData {
  date: string;
  amount: number;
  count: number;
}

interface PaymentTrendChartProps {
  data: PaymentTrendData[];
  loading?: boolean;
  currency?: string;
  predictionData?: { date: string; predicted: number; confidence: number }[];
}

const chartConfig = {
  amount: {
    label: "Montant",
    color: "hsl(24, 95%, 53%)", // Orange
  },
  predicted: {
    label: "Prévision",
    color: "hsl(142, 76%, 36%)", // Green
  },
} satisfies ChartConfig;

export function PaymentTrendChart({
  data,
  loading,
  currency = "GNF",
  predictionData,
}: PaymentTrendChartProps) {
  const [period, setPeriod] = useState<"7" | "14" | "30">("30");

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-orange-500" />
            Tendance des Paiements
          </CardTitle>
          <CardDescription>Évolution quotidienne des paiements reçus</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filter data based on selected period
  const filteredData = data.slice(-parseInt(period));

  const totalAmount = filteredData.reduce((sum, item) => sum + item.amount, 0);
  const totalCount = filteredData.reduce((sum, item) => sum + item.count, 0);
  const avgAmount = filteredData.length > 0 ? Math.round(totalAmount / filteredData.length) : 0;

  // Calculate trend
  const firstHalf = filteredData.slice(0, Math.floor(filteredData.length / 2));
  const secondHalf = filteredData.slice(Math.floor(filteredData.length / 2));
  const firstHalfAvg = firstHalf.length > 0 
    ? firstHalf.reduce((sum, item) => sum + item.amount, 0) / firstHalf.length 
    : 0;
  const secondHalfAvg = secondHalf.length > 0 
    ? secondHalf.reduce((sum, item) => sum + item.amount, 0) / secondHalf.length 
    : 0;

  const trendPercent = firstHalfAvg > 0 
    ? Math.round(((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100) 
    : 0;

  const getTrendInfo = () => {
    if (trendPercent > 5) {
      return {
        icon: TrendingUp,
        label: "En hausse",
        color: "text-green-600 dark:text-green-400",
        bgColor: "bg-green-50 dark:bg-green-900/20",
      };
    }
    if (trendPercent < -5) {
      return {
        icon: TrendingDown,
        label: "En baisse",
        color: "text-red-600 dark:text-red-400",
        bgColor: "bg-red-50 dark:bg-red-900/20",
      };
    }
    return {
      icon: Minus,
      label: "Stable",
      color: "text-gray-600 dark:text-gray-400",
      bgColor: "bg-gray-50 dark:bg-gray-800/50",
    };
  };

  const trend = getTrendInfo();
  const TrendIcon = trend.icon;

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M ${currency}`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}k ${currency}`;
    }
    return `${value} ${currency}`;
  };

  // Merge with prediction data if available
  const combinedData = predictionData
    ? [...filteredData, ...predictionData.map(p => ({ date: p.date, amount: 0, count: 0, predicted: p.predicted }))]
    : filteredData;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-orange-500" />
              Tendance des Paiements
            </CardTitle>
            <CardDescription>Évolution quotidienne des paiements reçus</CardDescription>
          </div>
          <ToggleGroup
            type="single"
            value={period}
            onValueChange={(value) => value && setPeriod(value as "7" | "14" | "30")}
            className="border rounded-lg p-1"
          >
            <ToggleGroupItem value="7" className="text-xs px-2">
              7j
            </ToggleGroupItem>
            <ToggleGroupItem value="14" className="text-xs px-2">
              14j
            </ToggleGroupItem>
            <ToggleGroupItem value="30" className="text-xs px-2">
              30j
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-1">Total période</p>
            <p className="text-xl font-bold text-orange-600">{formatCurrency(totalAmount)}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-1">Paiements</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{totalCount}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-1">Moyenne/jour</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(avgAmount)}</p>
          </div>
          <div className={`${trend.bgColor} rounded-lg p-4`}>
            <p className="text-sm text-gray-500 mb-1">Tendance</p>
            <div className="flex items-center gap-2">
              <TrendIcon className={`h-5 w-5 ${trend.color}`} />
              <p className={`text-xl font-bold ${trend.color}`}>
                {trendPercent > 0 ? "+" : ""}{trendPercent}%
              </p>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-[300px]">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <ResponsiveContainer>
              <AreaChart data={combinedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="amountGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(24, 95%, 53%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(24, 95%, 53%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="predictedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  className="text-xs"
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  className="text-xs"
                  tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name === "amount" ? "Paiements" : "Prévision",
                  ]}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                {avgAmount > 0 && (
                  <ReferenceLine
                    y={avgAmount}
                    stroke="hsl(24, 95%, 53%)"
                    strokeDasharray="3 3"
                    label={{
                      value: "Moyenne",
                      position: "insideTopRight",
                      fill: "hsl(24, 95%, 53%)",
                      fontSize: 10,
                    }}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="hsl(24, 95%, 53%)"
                  fill="url(#amountGradient)"
                  strokeWidth={2}
                />
                {predictionData && (
                  <Area
                    type="monotone"
                    dataKey="predicted"
                    stroke="hsl(142, 76%, 36%)"
                    fill="url(#predictedGradient)"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        {/* Insight */}
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <strong>Analyse:</strong> Sur les {period} derniers jours, vous avez reçu{" "}
            <strong className="text-orange-600">{formatCurrency(totalAmount)}</strong> en{" "}
            <strong>{totalCount}</strong> paiement{totalCount > 1 ? "s" : ""}.{" "}
            {trendPercent > 5 ? (
              <span className="text-green-600">La tendance est à la hausse (+{trendPercent}%).</span>
            ) : trendPercent < -5 ? (
              <span className="text-red-600">La tendance est à la baisse ({trendPercent}%).</span>
            ) : (
              <span>Les paiements restent stables.</span>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
