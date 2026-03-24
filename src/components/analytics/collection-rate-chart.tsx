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
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

interface CollectionRateData {
  date: string;
  rate: number;
  recovered: number;
  total: number;
}

interface CollectionRateChartProps {
  data: CollectionRateData[];
  loading?: boolean;
}

const chartConfig = {
  rate: {
    label: "Taux (%)",
    color: "hsl(24, 95%, 53%)", // Orange
  },
} satisfies ChartConfig;

export function CollectionRateChart({ data, loading }: CollectionRateChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-orange-500" />
            Taux de Recouvrement
          </CardTitle>
          <CardDescription>Évolution mensuelle</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-orange-500" />
          Taux de Recouvrement
        </CardTitle>
        <CardDescription>Évolution mensuelle du taux de recouvrement</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              className="text-xs"
            />
            <YAxis
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
                  formatter={(value) => [`${value}%`, "Taux"]}
                />
              }
            />
            <Line
              type="monotone"
              dataKey="rate"
              stroke="hsl(24, 95%, 53%)"
              strokeWidth={3}
              dot={{ fill: "hsl(24, 95%, 53%)", strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, strokeWidth: 2 }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
