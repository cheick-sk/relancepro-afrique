"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ZAxis,
  Cell,
  Tooltip,
} from "recharts";
import { formatCurrency } from "@/lib/analytics/calculations";
import { Brain, AlertTriangle, CheckCircle, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
  loading?: boolean;
  currency?: string;
  onPointClick?: (item: PaymentPredictionData) => void;
}

const riskColors = {
  very_high: "#22c55e", // Green - very likely to pay
  high: "#84cc16", // Lime green
  medium: "#f59e0b", // Amber
  low: "#f97316", // Orange
  very_low: "#ef4444", // Red - unlikely to pay
};

const riskLabels = {
  very_high: "Très probable",
  high: "Probable",
  medium: "Moyen",
  low: "Peu probable",
  very_low: "Très improbable",
};

const chartConfig = {
  probability: {
    label: "Probabilité",
  },
  amount: {
    label: "Montant",
  },
} satisfies ChartConfig;

export function PaymentPredictionChart({
  data,
  title = "Prédictions de paiement",
  description = "Probabilité de paiement par créance",
  loading = false,
  currency = "GNF",
  onPointClick,
}: PaymentPredictionChartProps) {
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

  // Transform data for scatter plot
  const scatterData = data.map((item) => ({
    ...item,
    x: item.probability,
    y: item.amount,
    z: Math.min(Math.max(item.amount / 1000000, 5), 30), // Size between 5 and 30
  }));

  // Risk level summary
  const riskSummary = {
    very_high: data.filter((d) => d.riskLevel === "very_high").length,
    high: data.filter((d) => d.riskLevel === "high").length,
    medium: data.filter((d) => d.riskLevel === "medium").length,
    low: data.filter((d) => d.riskLevel === "low").length,
    very_low: data.filter((d) => d.riskLevel === "very_low").length,
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Brain className="h-5 w-5 text-orange-500" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Risk level legend */}
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(riskSummary).map(([level, count]) => (
            <div key={level} className="flex items-center gap-1.5">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: riskColors[level as keyof typeof riskColors] }}
              />
              <span className="text-xs text-muted-foreground">
                {riskLabels[level as keyof typeof riskLabels]}
              </span>
              <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                {count}
              </Badge>
            </div>
          ))}
        </div>

        <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
            <XAxis
              type="number"
              dataKey="x"
              name="probabilité"
              unit="%"
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              className="text-xs"
              tick={{ fill: "currentColor", opacity: 0.7 }}
              label={{
                value: "Probabilité de paiement (%)",
                position: "bottom",
                offset: 0,
                className: "text-xs fill-muted-foreground",
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="montant"
              tickFormatter={(value) => {
                if (value >= 1000000) return `${(value / 1000000).toFixed(0)}M`;
                if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                return value;
              }}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              className="text-xs"
              tick={{ fill: "currentColor", opacity: 0.7 }}
            />
            <ZAxis type="number" dataKey="z" range={[50, 400]} />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;

                const item = payload[0].payload as PaymentPredictionData;
                return (
                  <div className="rounded-lg border bg-background p-3 shadow-md max-w-[250px]">
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: riskColors[item.riskLevel] }}
                      />
                      <span className="font-medium text-sm truncate">{item.clientName}</span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Référence:</span>
                        <span className="font-medium">{item.reference}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Montant:</span>
                        <span className="font-medium">{formatCurrency(item.amount, currency)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Probabilité:</span>
                        <span className="font-medium">{item.probability}%</span>
                      </div>
                      {item.predictedDate && (
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">Date prédite:</span>
                          <span className="font-medium">{item.predictedDate}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }}
            />
            <Scatter
              data={scatterData}
              fill="#f59e0b"
              onClick={(data) => onPointClick?.(data as PaymentPredictionData)}
            >
              {scatterData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={riskColors[entry.riskLevel]}
                  fillOpacity={0.7}
                  className="cursor-pointer hover:fill-opacity-100 transition-all"
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ChartContainer>

        {/* Axis labels and interpretation */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 text-red-500">
              <AlertTriangle className="h-3 w-3" />
              <span>Peu probable de payer</span>
            </div>
            <div className="flex items-center gap-1">
              <Minus className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">→ Probabilité →</span>
            </div>
            <div className="flex items-center gap-1 text-green-500">
              <CheckCircle className="h-3 w-3" />
              <span>Très probable de payer</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Skeleton component
export function PaymentPredictionChartSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32 mt-1" />
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-20" />
          ))}
        </div>
        <Skeleton className="h-[280px] w-full" />
      </CardContent>
    </Card>
  );
}
