"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ComposedChart,
  Line,
} from "recharts";

export interface ReminderData {
  date: string;
  email: number;
  whatsapp: number;
  total: number;
  responseRate?: number;
}

interface RemindersChartProps {
  data: ReminderData[];
  title?: string;
  description?: string;
  view?: "day" | "week";
}

const chartConfig = {
  email: {
    label: "Email",
    color: "#3b82f6",
  },
  whatsapp: {
    label: "WhatsApp",
    color: "#22c55e",
  },
  total: {
    label: "Total",
    color: "#f59e0b",
  },
  responseRate: {
    label: "Taux de réponse",
    color: "#8b5cf6",
  },
} satisfies ChartConfig;

export function RemindersChart({
  data,
  title = "Relances envoyées",
  description = "Évolution des relances par canal",
  view = "day",
}: RemindersChartProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {view && (
            <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
              Par {view === "day" ? "jour" : "semaine"}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <defs>
              <linearGradient id="emailGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="whatsappGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              className="text-xs"
              tickFormatter={(value) => {
                if (view === "week") return value;
                // For daily view, show abbreviated date
                const date = new Date(value);
                return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
              }}
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
                  <div className="rounded-lg border bg-background p-3 shadow-md">
                    <p className="font-medium text-sm mb-2">{label}</p>
                    <div className="space-y-1">
                      {payload.map((entry, index) => (
                        <div key={index} className="flex items-center justify-between gap-4 text-xs">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-muted-foreground">
                              {entry.name === "email"
                                ? "Email"
                                : entry.name === "whatsapp"
                                ? "WhatsApp"
                                : entry.name === "responseRate"
                                ? "Taux de réponse"
                                : "Total"}
                              :
                            </span>
                          </div>
                          <span className="font-medium">
                            {entry.name === "responseRate"
                              ? `${entry.value}%`
                              : entry.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }}
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="email"
              stackId="1"
              stroke="#3b82f6"
              fill="url(#emailGradient)"
              strokeWidth={2}
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="whatsapp"
              stackId="1"
              stroke="#22c55e"
              fill="url(#whatsappGradient)"
              strokeWidth={2}
            />
            {data[0]?.responseRate !== undefined && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="responseRate"
                stroke="#8b5cf6"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: "#8b5cf6", strokeWidth: 2, r: 3 }}
              />
            )}
          </ComposedChart>
        </ChartContainer>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-blue-500" />
            <span>Email</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-green-500" />
            <span>WhatsApp</span>
          </div>
          {data[0]?.responseRate !== undefined && (
            <div className="flex items-center gap-2">
              <div className="h-0.5 w-3 border-t-2 border-dashed border-purple-500" />
              <span>Taux de réponse</span>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">
              {data.reduce((sum, d) => sum + d.email, 0)}
            </p>
            <p className="text-xs text-muted-foreground">Emails envoyés</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {data.reduce((sum, d) => sum + d.whatsapp, 0)}
            </p>
            <p className="text-xs text-muted-foreground">WhatsApp envoyés</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">
              {data[0]?.responseRate !== undefined
                ? `${Math.round(
                    data.reduce((sum, d) => sum + (d.responseRate || 0), 0) / data.length
                  )}%`
                : "-"}
            </p>
            <p className="text-xs text-muted-foreground">Taux de réponse moy.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Simple area chart version
export function RemindersAreaChart({ data }: { data: ReminderData[] }) {
  return (
    <ChartContainer config={chartConfig} className="h-[200px] w-full">
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
        <XAxis dataKey="date" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          type="monotone"
          dataKey="total"
          stroke="#f59e0b"
          fill="#f59e0b"
          fillOpacity={0.2}
        />
      </AreaChart>
    </ChartContainer>
  );
}
