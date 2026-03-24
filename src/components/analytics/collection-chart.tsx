"use client";

import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Calendar,
  BarChart3,
  LineChartIcon,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";

interface CollectionData {
  date: string;
  collected: number;
  previousPeriod?: number;
  dateKey?: string;
}

interface CollectionChartProps {
  data: CollectionData[];
  previousPeriodData?: CollectionData[];
  loading?: boolean;
  currency?: string;
  groupBy?: "day" | "week" | "month";
}

// CustomTooltip component defined outside to avoid re-creation
function CollectionTooltip({
  active,
  payload,
  label,
  currency,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  currency: string;
}) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <p className="font-medium text-gray-900 dark:text-white mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600 dark:text-gray-400">
              {entry.name === "collected" ? "Période actuelle" : "Période précédente"}:
            </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {entry.value.toLocaleString("fr-FR")} {currency}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

// Area chart icon component
function AreaChartIconL({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 20h18" />
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M3 17v-4l6-6 4 4 8-8v14" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

function formatCurrencyShort(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K`;
  }
  return value.toString();
}

export function CollectionChart({
  data,
  previousPeriodData,
  loading,
  currency = "GNF",
  groupBy = "month",
}: CollectionChartProps) {
  const [chartType, setChartType] = useState<"area" | "line" | "bar">("area");
  const [showComparison, setShowComparison] = useState(true);

  const mergedData = useMemo(() => {
    if (!previousPeriodData || !showComparison) return data;

    // Merge current and previous data
    return data.map((item, index) => ({
      ...item,
      previousPeriod: previousPeriodData[index]?.collected || 0,
    }));
  }, [data, previousPeriodData, showComparison]);

  // Calculate totals and trends
  const totalCollected = useMemo(() => {
    return data.reduce((sum, item) => sum + item.collected, 0);
  }, [data]);

  const previousTotalCollected = useMemo(() => {
    if (!previousPeriodData) return 0;
    return previousPeriodData.reduce((sum, item) => sum + item.collected, 0);
  }, [previousPeriodData]);

  const changePercentage = useMemo(() => {
    if (previousTotalCollected === 0) return 0;
    return Math.round(((totalCollected - previousTotalCollected) / previousTotalCollected) * 100);
  }, [totalCollected, previousTotalCollected]);

  const averageCollected = useMemo(() => {
    if (data.length === 0) return 0;
    return Math.round(totalCollected / data.length);
  }, [data, totalCollected]);

  const peakCollected = useMemo(() => {
    if (data.length === 0) return { value: 0, date: "N/A" };
    const peak = data.reduce((max, item) => (item.collected > max.collected ? item : max), data[0]);
    return { value: peak.collected, date: peak.date };
  }, [data]);

  if (loading) {
    return (
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            Évolution des Encaissements
          </CardTitle>
          <CardDescription>Chargement des données...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-1">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Évolution des Encaissements
            </CardTitle>
            <CardDescription>
              Montants collectés groupés par {groupBy === "day" ? "jour" : groupBy === "week" ? "semaine" : "mois"}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 p-1">
              <Button
                variant={chartType === "area" ? "default" : "ghost"}
                size="sm"
                onClick={() => setChartType("area")}
                className={chartType === "area" ? "bg-green-500 hover:bg-green-600" : ""}
              >
                <AreaChartIconL className="h-4 w-4" />
              </Button>
              <Button
                variant={chartType === "line" ? "default" : "ghost"}
                size="sm"
                onClick={() => setChartType("line")}
                className={chartType === "line" ? "bg-green-500 hover:bg-green-600" : ""}
              >
                <LineChartIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={chartType === "bar" ? "default" : "ghost"}
                size="sm"
                onClick={() => setChartType("bar")}
                className={chartType === "bar" ? "bg-green-500 hover:bg-green-600" : ""}
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
            </div>
            {previousPeriodData && previousPeriodData.length > 0 && (
              <Button
                variant={showComparison ? "default" : "outline"}
                size="sm"
                onClick={() => setShowComparison(!showComparison)}
                className={showComparison ? "bg-green-500 hover:bg-green-600" : ""}
              >
                <Calendar className="h-4 w-4 mr-1" />
                Comparer
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Collecté</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {formatCurrencyShort(totalCollected)} {currency}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Moyenne</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {formatCurrencyShort(averageCollected)} {currency}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Pic</p>
            <p className="text-lg font-bold text-green-600">
              {formatCurrencyShort(peakCollected.value)} {currency}
            </p>
            <p className="text-xs text-gray-400">{peakCollected.date}</p>
          </div>
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">vs Précédent</p>
            <div className="flex items-center gap-1">
              {changePercentage > 0 ? (
                <ArrowUpRight className="h-4 w-4 text-green-500" />
              ) : changePercentage < 0 ? (
                <ArrowDownRight className="h-4 w-4 text-red-500" />
              ) : (
                <Minus className="h-4 w-4 text-gray-400" />
              )}
              <p
                className={`text-lg font-bold ${
                  changePercentage > 0
                    ? "text-green-600"
                    : changePercentage < 0
                    ? "text-red-600"
                    : "text-gray-600"
                }`}
              >
                {Math.abs(changePercentage)}%
              </p>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "area" ? (
              <AreaChart data={mergedData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorPrevious" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  className="text-xs"
                  tick={{ fill: "#6b7280" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  className="text-xs"
                  tickFormatter={formatCurrencyShort}
                  tick={{ fill: "#6b7280" }}
                />
                <Tooltip content={<CollectionTooltip currency={currency} />} />
                <Legend
                  formatter={(value) => (
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {value === "collected" ? "Période actuelle" : "Période précédente"}
                    </span>
                  )}
                />
                {showComparison && previousPeriodData && previousPeriodData.length > 0 && (
                  <Area
                    type="monotone"
                    dataKey="previousPeriod"
                    stroke="#94a3b8"
                    fillOpacity={1}
                    fill="url(#colorPrevious)"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="previous"
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="collected"
                  stroke="#22c55e"
                  fillOpacity={1}
                  fill="url(#colorCollected)"
                  strokeWidth={3}
                  name="collected"
                />
              </AreaChart>
            ) : chartType === "line" ? (
              <LineChart data={mergedData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  className="text-xs"
                  tick={{ fill: "#6b7280" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  className="text-xs"
                  tickFormatter={formatCurrencyShort}
                  tick={{ fill: "#6b7280" }}
                />
                <Tooltip content={<CollectionTooltip currency={currency} />} />
                <Legend
                  formatter={(value) => (
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {value === "collected" ? "Période actuelle" : "Période précédente"}
                    </span>
                  )}
                />
                {showComparison && previousPeriodData && previousPeriodData.length > 0 && (
                  <Line
                    type="monotone"
                    dataKey="previousPeriod"
                    stroke="#94a3b8"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    name="previous"
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="collected"
                  stroke="#22c55e"
                  strokeWidth={3}
                  dot={{ fill: "#22c55e", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 2 }}
                  name="collected"
                />
              </LineChart>
            ) : (
              <BarChart data={mergedData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-gray-200 dark:stroke-gray-700"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  className="text-xs"
                  tick={{ fill: "#6b7280" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  className="text-xs"
                  tickFormatter={formatCurrencyShort}
                  tick={{ fill: "#6b7280" }}
                />
                <Tooltip content={<CollectionTooltip currency={currency} />} />
                <Legend
                  formatter={(value) => (
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {value === "collected" ? "Période actuelle" : "Période précédente"}
                    </span>
                  )}
                />
                {showComparison && previousPeriodData && previousPeriodData.length > 0 && (
                  <Bar
                    dataKey="previousPeriod"
                    fill="#94a3b8"
                    radius={[4, 4, 0, 0]}
                    opacity={0.6}
                    name="previous"
                  />
                )}
                <Bar dataKey="collected" fill="#22c55e" radius={[4, 4, 0, 0]} name="collected" />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Trend Badge */}
        <div className="mt-4 flex items-center justify-between">
          <Badge
            variant="outline"
            className={`${
              changePercentage > 0
                ? "border-green-200 text-green-700 bg-green-50 dark:border-green-800 dark:text-green-400 dark:bg-green-900/20"
                : changePercentage < 0
                ? "border-red-200 text-red-700 bg-red-50 dark:border-red-800 dark:text-red-400 dark:bg-red-900/20"
                : "border-gray-200 text-gray-700 bg-gray-50"
            }`}
          >
            {changePercentage > 0 ? (
              <>
                <ArrowUpRight className="h-3 w-3 mr-1" />
                En hausse
              </>
            ) : changePercentage < 0 ? (
              <>
                <ArrowDownRight className="h-3 w-3 mr-1" />
                En baisse
              </>
            ) : (
              <>
                <Minus className="h-3 w-3 mr-1" />
                Stable
              </>
            )}
          </Badge>
          <span className="text-xs text-gray-500">
            {mergedData.length} {groupBy === "day" ? "jours" : groupBy === "week" ? "semaines" : "mois"} affichés
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
