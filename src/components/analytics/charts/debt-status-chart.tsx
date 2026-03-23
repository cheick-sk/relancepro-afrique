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
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Sector,
} from "recharts";
import { useState } from "react";
import { formatCurrency } from "@/lib/analytics/calculations";
import { PieChart as PieChartIcon } from "lucide-react";

export interface DebtStatusData {
  name: string;
  value: number;
  amount: number;
  color: string;
}

interface DebtStatusChartProps {
  data: DebtStatusData[];
  title?: string;
  description?: string;
  loading?: boolean;
  currency?: string;
}

const defaultColors = {
  "En attente": "#f59e0b",
  "Payées": "#22c55e",
  "Partielles": "#3b82f6",
  "Contestées": "#f97316",
  "Annulées": "#6b7280",
};

// Active shape for hover effect
const renderActiveShape = (props: any) => {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload,
    value,
    amount,
    currency,
  } = props;

  return (
    <g>
      <text x={cx} y={cy - 15} textAnchor="middle" fill="currentColor" className="text-2xl font-bold">
        {value}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="currentColor" className="text-sm text-muted-foreground">
        {payload.name}
      </text>
      <text x={cx} y={cy + 30} textAnchor="middle" fill="currentColor" className="text-xs text-muted-foreground">
        {formatCurrency(amount, currency)}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 12}
        outerRadius={outerRadius + 16}
        fill={fill}
      />
    </g>
  );
};

export function DebtStatusChart({
  data,
  title = "Répartition des créances",
  description = "Par statut",
  loading = false,
  currency = "GNF",
}: DebtStatusChartProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="flex items-center justify-center">
          <Skeleton className="h-[280px] w-[280px] rounded-full" />
        </CardContent>
      </Card>
    );
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);
  const totalAmount = data.reduce((sum, d) => sum + d.amount, 0);

  const chartConfig = data.reduce((acc, item) => {
    acc[item.name] = {
      label: item.name,
      color: item.color || defaultColors[item.name as keyof typeof defaultColors] || "#6b7280",
    };
    return acc;
  }, {} as ChartConfig);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <PieChartIcon className="h-5 w-5 text-orange-500" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <PieChart>
            <Pie
              activeIndex={activeIndex}
              activeShape={(props) => renderActiveShape({ ...props, currency })}
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              onMouseEnter={(_, index) => setActiveIndex(index)}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color || defaultColors[entry.name as keyof typeof defaultColors] || "#6b7280"}
                  stroke="transparent"
                />
              ))}
            </Pie>
            <ChartTooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;

                const data = payload[0].payload as DebtStatusData;
                return (
                  <div className="rounded-lg border bg-background p-3 shadow-md">
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: data.color }}
                      />
                      <span className="font-medium">{data.name}</span>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex justify-between gap-4">
                        <span>Nombre:</span>
                        <span className="font-semibold text-foreground">{data.value}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>Montant:</span>
                        <span className="font-semibold text-foreground">
                          {formatCurrency(data.amount, currency)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>Pourcentage:</span>
                        <span className="font-semibold text-foreground">
                          {total > 0 ? Math.round((data.value / total) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
          </PieChart>
        </ChartContainer>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          {data.map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 rounded p-1 transition-colors"
              onMouseEnter={() => setActiveIndex(index)}
            >
              <div
                className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color || defaultColors[item.name as keyof typeof defaultColors] }}
              />
              <span className="text-muted-foreground truncate">{item.name}</span>
              <span className="font-medium ml-auto">{item.value}</span>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total général:</span>
            <span className="font-semibold">{total} créances</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-muted-foreground">Montant total:</span>
            <span className="font-semibold">{formatCurrency(totalAmount, currency)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Simple donut version
export function DebtStatusDonutSimple({
  data,
  currency = "GNF",
}: {
  data: DebtStatusData[];
  currency?: string;
}) {
  return (
    <ChartContainer config={{}} className="h-[200px] w-full">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.color || defaultColors[entry.name as keyof typeof defaultColors] || "#6b7280"}
              stroke="transparent"
            />
          ))}
        </Pie>
        <ChartTooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as DebtStatusData;
            return (
              <div className="rounded-lg border bg-background p-2 shadow-md">
                <p className="font-medium text-sm">{d.name}</p>
                <p className="text-xs text-muted-foreground">
                  {d.value} créances - {formatCurrency(d.amount, currency)}
                </p>
              </div>
            );
          }}
        />
      </PieChart>
    </ChartContainer>
  );
}

// Skeleton component
export function DebtStatusChartSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32 mt-1" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[300px] w-full rounded-full" />
        <div className="grid grid-cols-2 gap-2 mt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
