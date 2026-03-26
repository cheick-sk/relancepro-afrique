"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import { formatCurrency } from "@/lib/analytics/calculations";
import { Shield, AlertTriangle, CheckCircle, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface RiskDistributionData {
  level: string;
  label: string;
  count: number;
  amount: number;
  color: string;
}

interface ClientRiskDistributionProps {
  data: RiskDistributionData[];
  title?: string;
  description?: string;
  loading?: boolean;
  currency?: string;
  onBarClick?: (item: RiskDistributionData) => void;
}

const riskIcons = {
  high: AlertTriangle,
  medium: Shield,
  low: CheckCircle,
  unknown: HelpCircle,
};

const chartConfig = {
  count: {
    label: "Nombre de clients",
  },
  amount: {
    label: "Montant",
  },
} satisfies ChartConfig;

export function ClientRiskDistribution({
  data,
  title = "Distribution des risques clients",
  description = "Par niveau de risque",
  loading = false,
  currency = "GNF",
  onBarClick,
}: ClientRiskDistributionProps) {
  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[280px] w-full" />
        </CardContent>
      </Card>
    );
  }

  // Calculate totals
  const totalClients = data.reduce((sum, d) => sum + d.count, 0);
  const totalAmount = data.reduce((sum, d) => sum + d.amount, 0);

  // Sort data by risk level
  const sortedData = [...data].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2, unknown: 3 };
    return (order[a.level as keyof typeof order] ?? 4) - (order[b.level as keyof typeof order] ?? 4);
  });

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5 text-orange-500" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">Total clients</p>
            <p className="text-xl font-bold">{totalClients}</p>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">Montant total</p>
            <p className="text-xl font-bold">{formatCurrency(totalAmount, currency)}</p>
          </div>
        </div>

        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <BarChart
            layout="vertical"
            data={sortedData}
            margin={{ top: 10, right: 60, left: 10, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} className="stroke-gray-200 dark:stroke-gray-700" />
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              className="text-xs"
              tick={{ fill: "currentColor", opacity: 0.7 }}
            />
            <YAxis
              type="category"
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              className="text-xs"
              tick={{ fill: "currentColor", opacity: 0.7 }}
              width={100}
            />
            <ChartTooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;

                const item = payload[0].payload as RiskDistributionData;
                return (
                  <div className="rounded-lg border bg-background p-3 shadow-md">
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="font-medium">{item.label}</span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Clients:</span>
                        <span className="font-semibold">{item.count}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Montant:</span>
                        <span className="font-semibold">{formatCurrency(item.amount, currency)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Part:</span>
                        <span className="font-semibold">
                          {totalClients > 0 ? Math.round((item.count / totalClients) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="count"
              radius={[0, 4, 4, 0]}
              onClick={(data) => onBarClick?.(data as RiskDistributionData)}
              className="cursor-pointer"
            >
              {sortedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
              ))}
              <LabelList
                dataKey="count"
                position="right"
                offset={8}
                className="fill-foreground text-xs font-medium"
                formatter={(value: number) => `${value} clients`}
              />
            </Bar>
          </BarChart>
        </ChartContainer>

        {/* Detailed breakdown */}
        <div className="mt-4 pt-4 border-t border-border space-y-2">
          {sortedData.map((item, index) => {
            const Icon = riskIcons[item.level as keyof typeof riskIcons] || HelpCircle;
            return (
              <div
                key={index}
                className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => onBarClick?.(item)}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" style={{ color: item.color }} />
                  <span>{item.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium">{item.count} clients</span>
                  <span className="text-muted-foreground">
                    {formatCurrency(item.amount, currency)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Simple horizontal bar version
export function ClientRiskDistributionSimple({
  data,
}: {
  data: RiskDistributionData[];
}) {
  const sortedData = [...data].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2, unknown: 3 };
    return (order[a.level as keyof typeof order] ?? 4) - (order[b.level as keyof typeof order] ?? 4);
  });

  return (
    <ChartContainer config={chartConfig} className="h-[200px] w-full">
      <BarChart layout="vertical" data={sortedData}>
        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
        <XAxis type="number" tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} width={80} />
        <ChartTooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const item = payload[0].payload as RiskDistributionData;
            return (
              <div className="rounded-lg border bg-background p-2 shadow-md">
                <p className="font-medium text-sm">{item.label}</p>
                <p className="text-xs text-muted-foreground">
                  {item.count} clients - {formatCurrency(item.amount, "GNF")}
                </p>
              </div>
            );
          }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
          {sortedData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

// Skeleton component
export function ClientRiskDistributionSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32 mt-1" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
        <Skeleton className="h-[250px] w-full" />
        <div className="mt-4 pt-4 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
