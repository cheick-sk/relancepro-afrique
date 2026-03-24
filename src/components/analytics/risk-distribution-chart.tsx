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
import { AlertTriangle, ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";

interface RiskDistributionData {
  level: string;
  count: number;
  amount: number;
  percentage: number;
}

interface RiskDistributionChartProps {
  data: RiskDistributionData[];
  loading?: boolean;
}

const RISK_COLORS: Record<string, string> = {
  "Faible": "hsl(142, 76%, 36%)",    // Green
  "Moyen": "hsl(38, 92%, 50%)",       // Amber
  "Élevé": "hsl(0, 84%, 60%)",        // Red
  "Non évalué": "hsl(215, 16%, 47%)", // Gray
};

const RISK_ICONS: Record<string, typeof ShieldCheck> = {
  "Faible": ShieldCheck,
  "Moyen": ShieldAlert,
  "Élevé": AlertTriangle,
  "Non évalué": ShieldQuestion,
};

export function RiskDistributionChart({ data, loading }: RiskDistributionChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Distribution des Risques
          </CardTitle>
          <CardDescription>Répartition des clients par niveau de risque</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Distribution des Risques
        </CardTitle>
        <CardDescription>Répartition des clients par niveau de risque</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
              <XAxis type="number" tickLine={false} axisLine={false} className="text-xs" />
              <YAxis
                type="category"
                dataKey="level"
                tickLine={false}
                axisLine={false}
                className="text-xs"
                width={80}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  name === "count" ? `${value} clients` : `${value.toLocaleString("fr-FR")} GNF`,
                  name === "count" ? "Clients" : "Montant",
                ]}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={RISK_COLORS[entry.level] || "hsl(24, 95%, 53%)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Risk Legend */}
        <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          {data.map((item) => {
            const Icon = RISK_ICONS[item.level] || ShieldQuestion;
            return (
              <div key={item.level} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: RISK_COLORS[item.level] || "gray" }}
                />
                <Icon className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {item.level}: {item.count}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
