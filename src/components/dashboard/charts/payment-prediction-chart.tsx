"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { cn } from "@/lib/utils";

export interface PaymentPredictionData {
  id: string;
  reference: string;
  clientName: string;
  amount: number;
  probability: number;
  riskLevel: "very_low" | "low" | "medium" | "high" | "very_high";
  predictedDate?: string;
}

interface PaymentPredictionChartProps {
  data: PaymentPredictionData[];
  title?: string;
  description?: string;
  onItemClick?: (item: PaymentPredictionData) => void;
}

const chartConfig = {
  probability: {
    label: "Probabilité",
    color: "#22c55e",
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

const getBarColor = (probability: number) => {
  if (probability >= 80) return "#22c55e"; // green - very high
  if (probability >= 60) return "#84cc16"; // lime - high
  if (probability >= 40) return "#f59e0b"; // amber - medium
  if (probability >= 20) return "#f97316"; // orange - low
  return "#ef4444"; // red - very low
};

const getRiskLevelColor = (level: string) => {
  switch (level) {
    case "very_high":
      return "bg-green-100 text-green-700 border-green-200";
    case "high":
      return "bg-lime-100 text-lime-700 border-lime-200";
    case "medium":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "low":
      return "bg-orange-100 text-orange-700 border-orange-200";
    case "very_low":
      return "bg-red-100 text-red-700 border-red-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
};

const getRiskLevelLabel = (level: string) => {
  switch (level) {
    case "very_high":
      return "Très élevée";
    case "high":
      return "Élevée";
    case "medium":
      return "Moyenne";
    case "low":
      return "Faible";
    case "very_low":
      return "Très faible";
    default:
      return "N/A";
  }
};

export function PaymentPredictionChart({
  data,
  title = "Prédictions de paiement par IA",
  description = "Probabilité de paiement estimée par intelligence artificielle",
  onItemClick,
}: PaymentPredictionChartProps) {
  // Sort by probability (ascending - lowest first for horizontal bar)
  const sortedData = [...data].sort((a, b) => a.probability - b.probability);

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
            <span>✨</span>
            <span>IA</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[320px] w-full">
          <BarChart
            data={sortedData}
            layout="vertical"
            margin={{ top: 20, right: 50, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
            <XAxis
              type="number"
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
              tickLine={false}
              axisLine={false}
              className="text-xs"
            />
            <YAxis
              type="category"
              dataKey="reference"
              tickLine={false}
              axisLine={false}
              className="text-xs"
              width={80}
              tickFormatter={(value) => value.length > 12 ? `${value.slice(0, 12)}...` : value}
            />
            <ChartTooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;

                const data = payload[0].payload as PaymentPredictionData;
                return (
                  <div className="rounded-lg border bg-background p-3 shadow-md">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                        Prédiction IA
                      </span>
                    </div>
                    <p className="font-medium text-sm mb-1">{data.clientName}</p>
                    <p className="text-xs text-muted-foreground mb-2">
                      Réf: {data.reference}
                    </p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Montant:</span>
                        <span className="font-medium">{formatGNF(data.amount)} GNF</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Probabilité:</span>
                        <span
                          className="font-medium"
                          style={{ color: getBarColor(data.probability) }}
                        >
                          {data.probability}%
                        </span>
                      </div>
                      {data.predictedDate && (
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">Date estimée:</span>
                          <span className="font-medium">{data.predictedDate}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }}
            />
            <Bar dataKey="probability" radius={[0, 4, 4, 0]}>
              {sortedData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getBarColor(entry.probability)}
                  className={cn(
                    "hover:opacity-80 transition-opacity cursor-pointer"
                  )}
                  onClick={() => onItemClick?.(entry)}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>

        {/* Risk Level Legend */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-red-500" />
            <span>0-20%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-orange-500" />
            <span>20-40%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-amber-500" />
            <span>40-60%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-lime-500" />
            <span>60-80%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span>80-100%</span>
          </div>
        </div>

        {/* Predictions List */}
        <div className="mt-4 pt-4 border-t max-h-48 overflow-y-auto">
          <div className="space-y-2">
            {sortedData.reverse().map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                onClick={() => onItemClick?.(item)}
              >
                <div>
                  <p className="text-sm font-medium">{item.clientName}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.reference} • {formatGNF(item.amount)} GNF
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="text-sm font-bold"
                    style={{ color: getBarColor(item.probability) }}
                  >
                    {item.probability}%
                  </div>
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full border",
                      getRiskLevelColor(item.riskLevel)
                    )}
                  >
                    {getRiskLevelLabel(item.riskLevel)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
