"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

interface MonthlyTrendData {
  month: string;
  totalDebts: number;
  paidDebts: number;
  newDebts: number;
  recovered: number;
  reminders: number;
}

interface MonthlyTrendsChartProps {
  data: MonthlyTrendData[];
  loading?: boolean;
}

export function MonthlyTrendsChart({ data, loading }: MonthlyTrendsChartProps) {
  if (loading) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-orange-500" />
            Tendances Mensuelles
          </CardTitle>
          <CardDescription>Évolution sur les 12 derniers mois</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-orange-500" />
          Tendances Mensuelles
        </CardTitle>
        <CardDescription>Évolution sur les 12 derniers mois</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRecovered" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorNewDebts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(24, 95%, 53%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(24, 95%, 53%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorReminders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0} />
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
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}
                formatter={(value: number, name: string) => {
                  const labels: Record<string, string> = {
                    recovered: "Récupéré",
                    newDebts: "Nouvelles créances",
                    reminders: "Relances",
                  };
                  return [value.toLocaleString("fr-FR"), labels[name] || name];
                }}
              />
              <Legend
                formatter={(value) => {
                  const labels: Record<string, string> = {
                    recovered: "Récupéré",
                    newDebts: "Nouvelles créances",
                    reminders: "Relances",
                  };
                  return <span className="text-sm text-gray-600 dark:text-gray-400">{labels[value] || value}</span>;
                }}
              />
              <Area
                type="monotone"
                dataKey="recovered"
                stroke="hsl(142, 76%, 36%)"
                fillOpacity={1}
                fill="url(#colorRecovered)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="newDebts"
                stroke="hsl(24, 95%, 53%)"
                fillOpacity={1}
                fill="url(#colorNewDebts)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="reminders"
                stroke="hsl(221, 83%, 53%)"
                fillOpacity={1}
                fill="url(#colorReminders)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
