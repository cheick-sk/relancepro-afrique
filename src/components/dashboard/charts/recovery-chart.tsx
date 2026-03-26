"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ComposedChart,
  Legend,
} from "recharts";

export interface RecoveryData {
  month: string;
  recovered: number;
  total: number;
  rate: number;
}

interface RecoveryChartProps {
  data: RecoveryData[];
  title?: string;
  description?: string;
}

const chartConfig = {
  recovered: {
    label: "Montant récupéré",
    color: "#22c55e",
  },
  total: {
    label: "Créances totales",
    color: "#f59e0b",
  },
  rate: {
    label: "Tendance (%)",
    color: "#3b82f6",
  },
} satisfies ChartConfig;

const formatGNF = (value: number) => {
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(1)}Md GNF`;
  }
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M GNF`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K GNF`;
  }
  return `${value} GNF`;
};

export function RecoveryChart({
  data,
  title = "Montants récupérés par mois",
  description = "Évolution des récupérations et tendance",
}: RecoveryChartProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              className="text-xs"
            />
            <YAxis
              yAxisId="left"
              tickFormatter={(value) => formatGNF(value)}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              className="text-xs"
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={(value) => `${value}%`}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              className="text-xs"
            />
            <ChartTooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                
                return (
                  <div className="rounded-lg border bg-background p-2 shadow-md">
                    <p className="font-medium text-sm mb-2">{label}</p>
                    {payload.map((entry, index) => (
                      <div key={index} className="flex items-center gap-2 text-xs">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-muted-foreground">
                          {entry.name === "rate" 
                            ? "Tendance" 
                            : entry.name === "recovered" 
                            ? "Récupéré" 
                            : "Total"}:
                        </span>
                        <span className="font-medium">
                          {entry.name === "rate"
                            ? `${entry.value}%`
                            : formatGNF(entry.value as number)}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              }}
            />
            <Bar
              yAxisId="left"
              dataKey="recovered"
              fill="#22c55e"
              radius={[4, 4, 0, 0]}
              name="recovered"
            />
            <Bar
              yAxisId="left"
              dataKey="total"
              fill="#f59e0b"
              radius={[4, 4, 0, 0]}
              opacity={0.5}
              name="total"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="rate"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: "#3b82f6", strokeWidth: 2 }}
              name="rate"
            />
          </ComposedChart>
        </ChartContainer>
        <div className="flex items-center justify-center gap-6 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-green-500" />
            <span>Montant récupéré</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-amber-500 opacity-50" />
            <span>Créances totales</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-3 bg-blue-500" />
            <span>Tendance (%)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Simple version without card wrapper
export function RecoveryChartSimple({ data }: { data: RecoveryData[] }) {
  return (
    <ChartContainer config={chartConfig} className="h-[250px] w-full">
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
        <XAxis dataKey="month" tickLine={false} axisLine={false} />
        <YAxis
          yAxisId="left"
          tickFormatter={(value) => formatGNF(value)}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tickFormatter={(value) => `${value}%`}
          tickLine={false}
          axisLine={false}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar yAxisId="left" dataKey="recovered" fill="#22c55e" radius={[4, 4, 0, 0]} />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="rate"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
        />
      </ComposedChart>
    </ChartContainer>
  );
}
