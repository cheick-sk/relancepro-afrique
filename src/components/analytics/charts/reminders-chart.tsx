"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  Line,
  ComposedChart,
} from "recharts";
import { Mail, MessageCircle, CheckCircle } from "lucide-react";

export interface ReminderChartData {
  date: string;
  email: number;
  whatsapp: number;
  total: number;
  responses?: number;
  responseRate?: number;
}

interface RemindersChartProps {
  data: ReminderChartData[];
  title?: string;
  description?: string;
  loading?: boolean;
  showResponseRate?: boolean;
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
  responseRate: {
    label: "Taux de réponse",
    color: "#f59e0b",
  },
} satisfies ChartConfig;

export function RemindersChart({
  data,
  title = "Relances envoyées",
  description = "Par type de canal",
  loading = false,
  showResponseRate = true,
}: RemindersChartProps) {
  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  // Calculate totals
  const totalEmail = data.reduce((sum, d) => sum + d.email, 0);
  const totalWhatsapp = data.reduce((sum, d) => sum + d.whatsapp, 0);
  const totalReminders = totalEmail + totalWhatsapp;
  const avgResponseRate = data.length > 0
    ? Math.round(data.reduce((sum, d) => sum + (d.responseRate || 0), 0) / data.length)
    : 0;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Mail className="h-5 w-5 text-orange-500" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Mail className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Email</span>
            </div>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{totalEmail}</p>
          </div>
          <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <MessageCircle className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">WhatsApp</span>
            </div>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">{totalWhatsapp}</p>
          </div>
          <div className="text-center p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <CheckCircle className="h-4 w-4 text-orange-500" />
              <span className="text-xs text-muted-foreground">Réponses</span>
            </div>
            <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{avgResponseRate}%</p>
          </div>
        </div>

        <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              className="text-xs"
              tick={{ fill: "currentColor", opacity: 0.7 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              yAxisId="left"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              className="text-xs"
              tick={{ fill: "currentColor", opacity: 0.7 }}
            />
            {showResponseRate && (
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={(value) => `${value}%`}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                className="text-xs"
                tick={{ fill: "currentColor", opacity: 0.7 }}
                domain={[0, 100]}
              />
            )}
            <ChartTooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;

                return (
                  <div className="rounded-lg border bg-background p-3 shadow-md">
                    <p className="font-medium text-sm mb-2 text-muted-foreground">{label}</p>
                    <div className="space-y-1">
                      {payload.map((entry, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <div
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: entry.color }}
                          />
                          <span className="text-muted-foreground">
                            {entry.name === "email"
                              ? "Email"
                              : entry.name === "whatsapp"
                              ? "WhatsApp"
                              : "Taux de réponse"}
                            :
                          </span>
                          <span className="font-semibold">
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
            <Bar
              yAxisId="left"
              dataKey="email"
              fill="#3b82f6"
              radius={[4, 4, 0, 0]}
              name="email"
            />
            <Bar
              yAxisId="left"
              dataKey="whatsapp"
              fill="#22c55e"
              radius={[4, 4, 0, 0]}
              name="whatsapp"
            />
            {showResponseRate && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="responseRate"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ fill: "#f59e0b", strokeWidth: 2, r: 3 }}
                name="responseRate"
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
          {showResponseRate && (
            <div className="flex items-center gap-2">
              <div className="h-0.5 w-3 bg-orange-500" />
              <span>Taux de réponse (%)</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Simple bar chart version
export function RemindersChartSimple({ data }: { data: ReminderChartData[] }) {
  return (
    <ChartContainer config={chartConfig} className="h-[200px] w-full">
      <RechartsBarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
        <XAxis dataKey="date" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="email" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        <Bar dataKey="whatsapp" fill="#22c55e" radius={[4, 4, 0, 0]} />
      </RechartsBarChart>
    </ChartContainer>
  );
}

// Skeleton component
export function RemindersChartSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32 mt-1" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
        <Skeleton className="h-[280px] w-full" />
      </CardContent>
    </Card>
  );
}
