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
import { 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  ShieldQuestion,
  Users,
} from "lucide-react";

interface ClientsRiskData {
  level: string;
  count: number;
  amount: number;
  percentage: number;
}

interface ClientsRiskChartProps {
  data: ClientsRiskData[];
  loading?: boolean;
  currency?: string;
}

const RISK_COLORS: Record<string, string> = {
  "Faible": "hsl(142, 76%, 36%)",     // Green
  "Moyen": "hsl(38, 92%, 50%)",       // Amber
  "Élevé": "hsl(0, 84%, 60%)",        // Red
  "Non évalué": "hsl(215, 16%, 47%)", // Gray
};

const RISK_BG_COLORS: Record<string, string> = {
  "Faible": "bg-green-50 dark:bg-green-900/20",
  "Moyen": "bg-amber-50 dark:bg-amber-900/20",
  "Élevé": "bg-red-50 dark:bg-red-900/20",
  "Non évalué": "bg-gray-50 dark:bg-gray-800/50",
};

const RISK_ICONS: Record<string, typeof ShieldCheck> = {
  "Faible": ShieldCheck,
  "Moyen": ShieldAlert,
  "Élevé": AlertTriangle,
  "Non évalué": ShieldQuestion,
};

function formatCurrencyValue(value: number, currency: string): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M ${currency}`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}k ${currency}`;
  }
  return `${value} ${currency}`;
}

// CustomTooltip component defined outside to avoid re-creation
function ClientsRiskTooltip({
  active,
  payload,
  label,
  currency,
}: {
  active?: boolean;
  payload?: Array<{ payload: ClientsRiskData }>;
  label?: string;
  currency: string;
}) {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div className="bg-white dark:bg-gray-800 px-4 py-3 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700">
        <p className="font-medium text-gray-900 dark:text-white mb-2">{label}</p>
        <div className="space-y-1 text-sm">
          <p className="text-gray-600 dark:text-gray-400">
            <span className="font-medium">{item.count}</span> client{item.count > 1 ? "s" : ""}
          </p>
          <p className="text-orange-600 font-medium">
            {formatCurrencyValue(item.amount, currency)}
          </p>
          <p className="text-gray-500">
            {item.percentage}% des clients
          </p>
        </div>
      </div>
    );
  }
  return null;
}

export function ClientsRiskChart({
  data,
  loading,
  currency = "GNF",
}: ClientsRiskChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-orange-500" />
            Clients par Niveau de Risque
          </CardTitle>
          <CardDescription>Distribution des clients selon leur profil de risque</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalClients = data.reduce((sum, item) => sum + item.count, 0);
  const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-orange-500" />
          Clients par Niveau de Risque
        </CardTitle>
        <CardDescription>Distribution des clients selon leur profil de risque</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {data.map((item) => {
            const Icon = RISK_ICONS[item.level] || ShieldQuestion;
            const bgColor = RISK_BG_COLORS[item.level] || "bg-gray-50";
            const color = RISK_COLORS[item.level] || "#f97316";
            
            return (
              <div
                key={item.level}
                className={`${bgColor} rounded-lg p-3 text-center`}
              >
                <Icon 
                  className="h-5 w-5 mx-auto mb-1" 
                  style={{ color }} 
                />
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {item.count}
                </p>
                <p className="text-xs text-gray-500">{item.level}</p>
              </div>
            );
          })}
        </div>

        {/* Chart */}
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-muted"
                horizontal={false}
              />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                className="text-xs"
              />
              <YAxis
                type="category"
                dataKey="level"
                tickLine={false}
                axisLine={false}
                className="text-xs"
                width={80}
                tickFormatter={(value) => value}
              />
              <Tooltip content={<ClientsRiskTooltip currency={currency} />} />
              <Bar
                dataKey="count"
                radius={[0, 6, 6, 0]}
                barSize={32}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={RISK_COLORS[entry.level] || "hsl(24, 95%, 53%)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Footer Summary */}
        <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalClients}</p>
            <p className="text-sm text-gray-500">Total clients</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600">{formatCurrencyValue(totalAmount, currency)}</p>
            <p className="text-sm text-gray-500">Exposition totale</p>
          </div>
        </div>

        {/* Risk Analysis Note */}
        {data.find(d => d.level === "Non évalué") && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              <strong>Note:</strong> Certains clients n&apos;ont pas encore été évalués. 
              Activez l&apos;analyse IA pour obtenir des scores de risque automatiques.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
