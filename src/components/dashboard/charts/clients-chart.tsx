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
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface ClientDebtData {
  id: string;
  name: string;
  fullName: string;
  amount: number;
  paid: number;
  count: number;
  riskScore?: number;
  riskLevel?: "low" | "medium" | "high";
}

interface ClientsChartProps {
  data: ClientDebtData[];
  title?: string;
  description?: string;
  onClientClick?: (clientId: string) => void;
}

const chartConfig = {
  amount: {
    label: "Montant dû",
    color: "#f59e0b",
  },
  paid: {
    label: "Payé",
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

const getRiskColor = (level: "low" | "medium" | "high" | undefined) => {
  switch (level) {
    case "low":
      return "bg-green-100 text-green-700";
    case "medium":
      return "bg-yellow-100 text-yellow-700";
    case "high":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const getRiskLabel = (level: "low" | "medium" | "high" | undefined) => {
  switch (level) {
    case "low":
      return "Faible";
    case "medium":
      return "Moyen";
    case "high":
      return "Élevé";
    default:
      return "N/A";
  }
};

const getBarColor = (riskLevel: "low" | "medium" | "high" | undefined) => {
  switch (riskLevel) {
    case "low":
      return "#22c55e";
    case "medium":
      return "#f59e0b";
    case "high":
      return "#ef4444";
    default:
      return "#f59e0b";
  }
};

export function ClientsChart({
  data,
  title = "Top 10 clients avec les plus grandes dettes",
  description = "Clients avec le montant de créances le plus élevé",
  onClientClick,
}: ClientsChartProps) {
  const router = useRouter();

  const handleBarClick = (clientId: string) => {
    if (onClientClick) {
      onClientClick(clientId);
    } else {
      router.push(`/clients?id=${clientId}`);
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[350px] w-full">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 20, right: 30, left: 80, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
            <XAxis
              type="number"
              tickFormatter={(value) => formatGNF(value)}
              tickLine={false}
              axisLine={false}
              className="text-xs"
            />
            <YAxis
              type="category"
              dataKey="name"
              tickLine={false}
              axisLine={false}
              className="text-xs"
              width={70}
            />
            <ChartTooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;

                const data = payload[0].payload as ClientDebtData;
                return (
                  <div className="rounded-lg border bg-background p-3 shadow-md">
                    <p className="font-medium text-sm mb-2">{data.fullName}</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Montant dû:</span>
                        <span className="font-medium">{formatGNF(data.amount)} GNF</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Déjà payé:</span>
                        <span className="font-medium text-green-600">{formatGNF(data.paid)} GNF</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Créances:</span>
                        <span className="font-medium">{data.count}</span>
                      </div>
                      {data.riskScore !== undefined && (
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">Score de risque:</span>
                          <span className="font-medium">{data.riskScore}/100</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Cliquez pour voir les détails
                    </p>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="amount"
              radius={[0, 4, 4, 0]}
              className="cursor-pointer"
              onClick={(data) => handleBarClick(data.id)}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getBarColor(entry.riskLevel)}
                  className="hover:opacity-80 transition-opacity cursor-pointer"
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>

        {/* Risk Legend */}
        <div className="mt-4 flex items-center justify-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span>Faible risque</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-amber-500" />
            <span>Risque moyen</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-red-500" />
            <span>Risque élevé</span>
          </div>
        </div>

        {/* Client List */}
        <div className="mt-4 pt-4 border-t max-h-48 overflow-y-auto">
          <div className="space-y-2">
            {data.map((client) => (
              <div
                key={client.id}
                className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                onClick={() => handleBarClick(client.id)}
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-orange-600">
                      {client.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{client.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {client.count} créance{client.count > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">
                    {formatGNF(client.amount)} GNF
                  </span>
                  {client.riskLevel && (
                    <Badge
                      variant="outline"
                      className={cn("text-xs", getRiskColor(client.riskLevel))}
                    >
                      {getRiskLabel(client.riskLevel)}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
