"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Sector,
} from "recharts";
import { useState } from "react";
import type { PieSectorDataItem } from "recharts/types/polar/Pie";

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
}

const chartConfig = {
  pending: {
    label: "En attente",
    color: "#f59e0b",
  },
  paid: {
    label: "Payées",
    color: "#22c55e",
  },
  partial: {
    label: "Partielles",
    color: "#3b82f6",
  },
  disputed: {
    label: "Contestées",
    color: "#f97316",
  },
  cancelled: {
    label: "Annulées",
    color: "#6b7280",
  },
} satisfies ChartConfig;

const formatGNF = (value: number) => {
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(1)}Md`;
  }
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K`;
  }
  return `${value}`;
};

// Active shape for hover effect
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    percent,
  } = props as {
    cx: number;
    cy: number;
    innerRadius: number;
    outerRadius: number;
    startAngle: number;
    endAngle: number;
    fill: string;
    payload: DebtStatusData;
    percent: number;
  };

  return (
    <g>
      <text x={cx} y={cy - 10} textAnchor="middle" fill="currentColor" className="text-lg font-bold">
        {payload.name}
      </text>
      <text x={cx} y={cy + 15} textAnchor="middle" fill="currentColor" className="text-sm text-muted-foreground">
        {formatGNF(payload.amount)} GNF
      </text>
      <text x={cx} y={cy + 35} textAnchor="middle" fill="currentColor" className="text-xs text-muted-foreground">
        {`${(percent * 100).toFixed(1)}%`}
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
        innerRadius={outerRadius + 10}
        outerRadius={outerRadius + 14}
        fill={fill}
      />
    </g>
  );
};

export function DebtStatusChart({
  data,
  title = "Répartition par statut",
  description = "Distribution des créances selon leur statut",
}: DebtStatusChartProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const total = data.reduce((sum, item) => sum + item.value, 0);

  const onPieEnter = (_: unknown, index: number) => {
    setActiveIndex(index);
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <PieChart>
            <Pie
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              onMouseEnter={onPieEnter}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>

        {/* Custom Legend with amounts */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          {data.map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
              onMouseEnter={() => setActiveIndex(index)}
            >
              <div
                className="h-3 w-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.value} créance{item.value > 1 ? "s" : ""} • {formatGNF(item.amount)} GNF
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="font-medium">{total} créances</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Simple donut version
export function DebtStatusDonut({ data }: { data: DebtStatusData[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <ChartContainer config={chartConfig} className="h-[200px] w-full">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={70}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <ChartTooltip content={<ChartTooltipContent />} />
      </PieChart>
    </ChartContainer>
  );
}
