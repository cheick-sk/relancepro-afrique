"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, AlertTriangle, ShieldAlert, ShieldCheck } from "lucide-react";

interface TopDebtorData {
  id: string;
  name: string;
  company: string | null;
  totalDebt: number;
  paidAmount: number;
  debtCount: number;
  riskLevel: string | null;
}

interface TopDebtorsChartProps {
  data: TopDebtorData[];
  loading?: boolean;
}

const RISK_COLORS: Record<string, string> = {
  low: "hsl(142, 76%, 36%)",
  medium: "hsl(38, 92%, 50%)",
  high: "hsl(0, 84%, 60%)",
};

export function TopDebtorsChart({ data, loading }: TopDebtorsChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-orange-500" />
            Top Débiteurs
          </CardTitle>
          <CardDescription>Les 10 clients avec le plus de dettes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxDebt = Math.max(...data.map((d) => d.totalDebt));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-orange-500" />
          Top Débiteurs
        </CardTitle>
        <CardDescription>Les 10 clients avec le plus de dettes impayées</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                className="text-xs"
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <YAxis
                type="category"
                dataKey="name"
                tickLine={false}
                axisLine={false}
                className="text-xs"
                width={100}
                tickFormatter={(value) => value.length > 12 ? `${value.slice(0, 12)}...` : value}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}
                formatter={(value: number) => [`${value.toLocaleString("fr-FR")} GNF`, "Dette"]}
                labelFormatter={(label) => `Client: ${label}`}
              />
              <Bar dataKey="totalDebt" radius={[0, 4, 4, 0]} barSize={20}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={RISK_COLORS[entry.riskLevel || ""] || "hsl(24, 95%, 53%)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-green-500" />
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: RISK_COLORS.low }} />
            <span className="text-xs text-gray-500">Faible</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: RISK_COLORS.medium }} />
            <span className="text-xs text-gray-500">Moyen</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-red-500" />
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: RISK_COLORS.high }} />
            <span className="text-xs text-gray-500">Élevé</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
