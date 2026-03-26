"use client";

import { useState } from "react";
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
  ReferenceLine,
  BarChart,
  Bar,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  BarChart3,
  LineChartIcon,
  Activity
} from "lucide-react";

interface TrendData {
  period: string;
  current: number;
  previous?: number;
  previousYear?: number;
  change?: number;
  yearChange?: number;
}

interface SeasonalPattern {
  month: string;
  avgCollection: number;
  index: number;
}

interface TrendAnalysisProps {
  monthlyData: TrendData[];
  seasonalPatterns: SeasonalPattern[];
  metrics: {
    momChange: number;
    yoyChange: number;
    avgMonthlyCollection: number;
    bestMonth: string;
    worstMonth: string;
  };
  loading?: boolean;
  currency?: string;
}

type ViewMode = "mom" | "yoy" | "seasonal";

const CustomTooltip = ({ 
  active, 
  payload, 
  label,
  currency,
  mode
}: { 
  active?: boolean; 
  payload?: Array<{ name: string; value: number; color: string; dataKey: string }>; 
  label?: string;
  currency?: string;
  mode: ViewMode;
}) => {
  if (active && payload && payload.length) {
    const formatValue = (val: number) => {
      if (mode === "seasonal") return val.toFixed(0);
      return `${val.toLocaleString("fr-FR")} ${currency}`;
    };

    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <p className="font-medium text-gray-900 dark:text-white mb-2">{label}</p>
        <div className="space-y-1">
          {payload.map((entry, index) => {
            let label = entry.name;
            if (entry.dataKey === "current") label = "Période actuelle";
            if (entry.dataKey === "previous") label = "Période précédente";
            if (entry.dataKey === "previousYear") label = "Année précédente";
            if (entry.dataKey === "avgCollection") label = "Moyenne";
            if (entry.dataKey === "index") label = "Indice saisonnier";
            
            return (
              <div key={index} className="flex items-center justify-between gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-gray-600 dark:text-gray-400">{label}:</span>
                </div>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatValue(entry.value)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

export function TrendAnalysis({ 
  monthlyData, 
  seasonalPatterns,
  metrics,
  loading,
  currency = "GNF" 
}: TrendAnalysisProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("mom");
  const [chartType, setChartType] = useState<"area" | "bar">("area");

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-orange-500" />
            Analyse des Tendances
          </CardTitle>
          <CardDescription>Comparaison mensuelle et annuelle</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const getChangeIcon = (change: number) => {
    if (change > 0) return <ArrowUpRight className="h-4 w-4" />;
    if (change < 0) return <ArrowDownRight className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return "text-green-600";
    if (change < 0) return "text-red-600";
    return "text-gray-600";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-orange-500" />
              Analyse des Tendances
            </CardTitle>
            <CardDescription>Évolution et patterns saisonniers</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 p-1">
              <Button
                variant={viewMode === "mom" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("mom")}
                className={viewMode === "mom" ? "bg-orange-500 hover:bg-orange-600" : ""}
              >
                MoM
              </Button>
              <Button
                variant={viewMode === "yoy" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("yoy")}
                className={viewMode === "yoy" ? "bg-orange-500 hover:bg-orange-600" : ""}
              >
                YoY
              </Button>
              <Button
                variant={viewMode === "seasonal" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("seasonal")}
                className={viewMode === "seasonal" ? "bg-orange-500 hover:bg-orange-600" : ""}
              >
                Saisonnier
              </Button>
            </div>
            <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 p-1">
              <Button
                variant={chartType === "area" ? "default" : "ghost"}
                size="sm"
                onClick={() => setChartType("area")}
                className={chartType === "area" ? "bg-orange-500 hover:bg-orange-600" : ""}
              >
                <LineChartIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={chartType === "bar" ? "default" : "ghost"}
                size="sm"
                onClick={() => setChartType("bar")}
                className={chartType === "bar" ? "bg-orange-500 hover:bg-orange-600" : ""}
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Key Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">MoM</span>
              <span className={`flex items-center ${getChangeColor(metrics.momChange)}`}>
                {getChangeIcon(metrics.momChange)}
                {Math.abs(metrics.momChange)}%
              </span>
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {viewMode === "mom" ? "vs mois dernier" : "vs mois dernier"}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">YoY</span>
              <span className={`flex items-center ${getChangeColor(metrics.yoyChange)}`}>
                {getChangeIcon(metrics.yoyChange)}
                {Math.abs(metrics.yoyChange)}%
              </span>
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              vs année précédente
            </p>
          </div>
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
            <span className="text-sm text-gray-500">Moyenne mensuelle</span>
            <p className="text-lg font-bold text-orange-600">
              {metrics.avgMonthlyCollection.toLocaleString("fr-FR")} {currency}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
            <span className="text-sm text-gray-500">Meilleur mois</span>
            <p className="text-lg font-bold text-green-600">{metrics.bestMonth}</p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            {viewMode === "seasonal" ? (
              <BarChart data={seasonalPatterns} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
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
                />
                <Tooltip content={<CustomTooltip currency={currency} mode="seasonal" />} />
                <ReferenceLine y={100} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: "Moyenne", position: "top", fill: "#f59e0b", fontSize: 10 }} />
                <Bar dataKey="index" fill="hsl(24, 95%, 53%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : chartType === "area" ? (
              <AreaChart data={monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="currentGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="previousGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6b7280" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6b7280" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="period"
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
                  tickFormatter={(value) => {
                    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                    return value;
                  }}
                />
                <Tooltip content={<CustomTooltip currency={currency} mode={viewMode} />} />
                <Legend 
                  formatter={(value) => (
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {value === "current" ? "Actuel" : value === "previous" ? "Précédent" : "Année préc."}
                    </span>
                  )}
                />
                {viewMode === "yoy" ? (
                  <Area
                    type="monotone"
                    dataKey="previousYear"
                    stroke="#6b7280"
                    fill="url(#previousGradient)"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />
                ) : (
                  <Area
                    type="monotone"
                    dataKey="previous"
                    stroke="#6b7280"
                    fill="url(#previousGradient)"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="current"
                  stroke="#f97316"
                  fill="url(#currentGradient)"
                  strokeWidth={3}
                />
              </AreaChart>
            ) : (
              <BarChart data={monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                <XAxis
                  dataKey="period"
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
                  tickFormatter={(value) => {
                    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                    return value;
                  }}
                />
                <Tooltip content={<CustomTooltip currency={currency} mode={viewMode} />} />
                <Legend 
                  formatter={(value) => (
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {value === "current" ? "Actuel" : value === "previous" ? "Précédent" : "Année préc."}
                    </span>
                  )}
                />
                {viewMode === "yoy" ? (
                  <Bar dataKey="previousYear" fill="#6b7280" radius={[4, 4, 0, 0]} opacity={0.6} />
                ) : (
                  <Bar dataKey="previous" fill="#6b7280" radius={[4, 4, 0, 0]} opacity={0.6} />
                )}
                <Bar dataKey="current" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Seasonal Insights */}
        {viewMode === "seasonal" && (
          <div className="mt-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-2">
              <Calendar className="h-5 w-5 text-amber-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                  Patterns saisonniers
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  Les meilleurs mois pour la collecte sont {metrics.bestMonth}, avec un indice supérieur à 100.
                  Le mois le plus faible est {metrics.worstMonth}. Planifiez vos relances en conséquence.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
