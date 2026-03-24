"use client";

import { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieSlice, CheckCircle, Clock, AlertCircle, XCircle } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface DebtsStatusData {
  status: string;
  count: number;
  amount: number;
  percentage: number;
}

interface DebtsStatusChartProps {
  data: DebtsStatusData[];
  loading?: boolean;
  currency?: string;
}

const STATUS_COLORS: Record<string, string> = {
  "En attente": "hsl(38, 92%, 50%)",    // Amber
  "Payée": "hsl(142, 76%, 36%)",         // Green
  "Partiel": "hsl(24, 95%, 53%)",        // Orange
  "Contestée": "hsl(280, 65%, 60%)",     // Purple
  "Annulée": "hsl(215, 16%, 47%)",       // Gray
};

const STATUS_ICONS: Record<string, typeof CheckCircle> = {
  "En attente": Clock,
  "Payée": CheckCircle,
  "Partiel": AlertCircle,
  "Contestée": AlertCircle,
  "Annulée": XCircle,
};

export function DebtsStatusChart({
  data,
  loading,
  currency = "GNF",
}: DebtsStatusChartProps) {
  const [chartType, setChartType] = useState<"pie" | "donut">("donut");

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieSlice className="h-5 w-5 text-orange-500" />
            Répartition par Statut
          </CardTitle>
          <CardDescription>Distribution des créances par statut</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);
  const totalCount = data.reduce((sum, item) => sum + item.count, 0);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M ${currency}`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}k ${currency}`;
    }
    return `${value} ${currency}`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 px-4 py-3 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700">
          <p className="font-medium text-gray-900 dark:text-white mb-2">{item.status}</p>
          <div className="space-y-1 text-sm">
            <p className="text-gray-600 dark:text-gray-400">
              <span className="font-medium">{item.count}</span> créance{item.count > 1 ? "s" : ""}
            </p>
            <p className="text-orange-600 font-medium">
              {formatCurrency(item.amount)}
            </p>
            <p className="text-gray-500">
              {item.percentage}% du total
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null;
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PieSlice className="h-5 w-5 text-orange-500" />
              Répartition par Statut
            </CardTitle>
            <CardDescription>Distribution des créances par statut</CardDescription>
          </div>
          <ToggleGroup
            type="single"
            value={chartType}
            onValueChange={(value) => value && setChartType(value as "pie" | "donut")}
            className="border rounded-lg p-1"
          >
            <ToggleGroupItem value="donut" className="text-xs px-3">
              Donut
            </ToggleGroupItem>
            <ToggleGroupItem value="pie" className="text-xs px-3">
              Pie
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalCount}</p>
            <p className="text-sm text-gray-500">Total créances</p>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalAmount)}</p>
            <p className="text-sm text-gray-500">Montant total</p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={chartType === "donut" ? 60 : 0}
                outerRadius={100}
                paddingAngle={2}
                dataKey="amount"
                nameKey="status"
                labelLine={false}
                label={CustomLabel}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={STATUS_COLORS[entry.status] || "hsl(24, 95%, 53%)"}
                    stroke="transparent"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend with icons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
          {data.map((item) => {
            const Icon = STATUS_ICONS[item.status] || Clock;
            return (
              <div
                key={item.status}
                className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50"
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: STATUS_COLORS[item.status] || "#f97316" }}
                />
                <Icon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                    {item.status}
                  </p>
                  <p className="text-xs text-gray-500">
                    {item.count} ({item.percentage}%)
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
