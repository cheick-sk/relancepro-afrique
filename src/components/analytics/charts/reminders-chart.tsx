"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  ComposedChart,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BellRing, Mail, MessageSquare, TrendingUp } from "lucide-react";

interface RemindersChartData {
  month: string;
  sent: number;
  successful: number;
  rate: number;
}

interface RemindersChartProps {
  data: RemindersChartData[];
  loading?: boolean;
  effectivenessData?: {
    type: string;
    sent: number;
    delivered: number;
    opened: number;
    responded: number;
    successRate: number;
  }[];
}

const chartConfig = {
  sent: {
    label: "Envoyées",
    color: "hsl(215, 16%, 47%)", // Gray
  },
  successful: {
    label: "Réussies",
    color: "hsl(142, 76%, 36%)", // Green
  },
  rate: {
    label: "Taux (%)",
    color: "hsl(24, 95%, 53%)", // Orange
  },
} satisfies ChartConfig;

export function RemindersChart({
  data,
  loading,
  effectivenessData,
}: RemindersChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellRing className="h-5 w-5 text-orange-500" />
            Efficacité des Relances
          </CardTitle>
          <CardDescription>Suivi des performances des relances</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalSent = data.reduce((sum, item) => sum + item.sent, 0);
  const totalSuccessful = data.reduce((sum, item) => sum + item.successful, 0);
  const avgSuccessRate = totalSent > 0 ? Math.round((totalSuccessful / totalSent) * 100) : 0;

  // Calculate channel effectiveness if provided
  const channelStats = effectivenessData?.reduce(
    (acc, item) => {
      acc[item.type] = item;
      return acc;
    },
    {} as Record<string, typeof effectivenessData[0]>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellRing className="h-5 w-5 text-orange-500" />
          Efficacité des Relances
        </CardTitle>
        <CardDescription>Suivi des performances des relances dans le temps</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Channel Stats */}
        {channelStats && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            {Object.entries(channelStats).map(([type, stats]) => (
              <div
                key={type}
                className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  {type === "Email" ? (
                    <Mail className="h-5 w-5 text-blue-500" />
                  ) : (
                    <MessageSquare className="h-5 w-5 text-green-500" />
                  )}
                  <span className="font-medium text-gray-900 dark:text-white">{type}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-500">Envoyées</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{stats.sent}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Réussies</p>
                    <p className="font-semibold text-green-600">{stats.successRate}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Main Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalSent}</p>
            <p className="text-sm text-gray-500">Total envoyées</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{totalSuccessful}</p>
            <p className="text-sm text-gray-500">Réussies</p>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-1">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              <p className="text-3xl font-bold text-orange-600">{avgSuccessRate}%</p>
            </div>
            <p className="text-sm text-gray-500">Taux moyen</p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-[280px]">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <ResponsiveContainer>
              <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="sentGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(215, 16%, 47%)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(215, 16%, 47%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="successfulGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
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
                  yAxisId="left"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  className="text-xs"
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  domain={[0, 100]}
                  className="text-xs"
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => {
                        if (name === "rate") {
                          return [`${value}%`, "Taux de succès"];
                        }
                        return [value, name === "sent" ? "Envoyées" : "Réussies"];
                      }}
                    />
                  }
                />
                <Legend
                  formatter={(value) => (
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {value === "sent" ? "Envoyées" : value === "successful" ? "Réussies" : "Taux"}
                    </span>
                  )}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="sent"
                  stroke="hsl(215, 16%, 47%)"
                  fill="url(#sentGradient)"
                  strokeWidth={2}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="successful"
                  stroke="hsl(142, 76%, 36%)"
                  fill="url(#successfulGradient)"
                  strokeWidth={2}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="rate"
                  stroke="hsl(24, 95%, 53%)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: "hsl(24, 95%, 53%)", strokeWidth: 2, r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        {/* Performance Insight */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-400">
            <strong>Insight:</strong> Le taux de succès moyen de vos relances est de{" "}
            <strong>{avgSuccessRate}%</strong>. 
            {avgSuccessRate >= 50 ? (
              <span> Continuez ainsi ! Les relances sont efficaces.</span>
            ) : (
              <span> Envisagez de personnaliser vos messages avec l&apos;IA.</span>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
