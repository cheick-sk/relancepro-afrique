"use client";

import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle,
  Users 
} from "lucide-react";

interface ClientRiskData {
  level: string;
  count: number;
  amount: number;
  percentage: number;
}

interface ClientRiskChartProps {
  data: ClientRiskData[];
  loading?: boolean;
  currency?: string;
  onRiskLevelClick?: (level: string) => void;
}

const RISK_CONFIG: Record<string, { 
  color: string; 
  bgColor: string; 
  textColor: string; 
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}> = {
  low: { 
    color: "#22c55e", 
    bgColor: "bg-green-100 dark:bg-green-900/30", 
    textColor: "text-green-600",
    icon: ShieldCheck,
    label: "Faible"
  },
  medium: { 
    color: "#f59e0b", 
    bgColor: "bg-amber-100 dark:bg-amber-900/30", 
    textColor: "text-amber-600",
    icon: AlertTriangle,
    label: "Moyen"
  },
  high: { 
    color: "#ef4444", 
    bgColor: "bg-red-100 dark:bg-red-900/30", 
    textColor: "text-red-600",
    icon: ShieldAlert,
    label: "Élevé"
  },
  undefined: { 
    color: "#6b7280", 
    bgColor: "bg-gray-100 dark:bg-gray-900/30", 
    textColor: "text-gray-600",
    icon: Shield,
    label: "Non évalué"
  },
};

const CustomTooltip = ({ 
  active, 
  payload, 
  currency 
}: { 
  active?: boolean; 
  payload?: Array<{ value: number; payload: ClientRiskData }>; 
  currency?: string;
}) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const config = RISK_CONFIG[data.level.toLowerCase()] || RISK_CONFIG.undefined;
    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-2">
          <config.icon className={`h-4 w-4 ${config.textColor}`} />
          <span className="font-medium text-gray-900 dark:text-white">
            Risque {config.label}
          </span>
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">Clients:</span>
            <span className="font-medium">{data.count}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">Montant dû:</span>
            <span className="font-medium">{data.amount.toLocaleString("fr-FR")} {currency}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">Part:</span>
            <span className="font-medium">{data.percentage.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function ClientRiskChart({ 
  data, 
  loading, 
  currency = "GNF",
  onRiskLevelClick 
}: ClientRiskChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const chartData = data.map(item => ({
    ...item,
    fill: RISK_CONFIG[item.level.toLowerCase()]?.color || RISK_CONFIG.undefined.color,
  }));

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange-500" />
            Clients par Niveau de Risque
          </CardTitle>
          <CardDescription>Répartition des clients selon leur profil de risque</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
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
          <Shield className="h-5 w-5 text-orange-500" />
          Clients par Niveau de Risque
        </CardTitle>
        <CardDescription>Cliquez sur une barre pour filtrer les clients</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={chartData} 
              layout="vertical"
              margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
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
                width={100}
                tickFormatter={(value) => {
                  const config = RISK_CONFIG[value.toLowerCase()];
                  return config?.label || value;
                }}
              />
              <Tooltip content={<CustomTooltip currency={currency} />} />
              <Bar 
                dataKey="count" 
                radius={[0, 4, 4, 0]}
                barSize={35}
                className="cursor-pointer"
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`}
                    fill={entry.fill}
                    opacity={activeIndex === null || activeIndex === index ? 1 : 0.4}
                    className="cursor-pointer transition-opacity duration-200"
                    onClick={() => onRiskLevelClick?.(entry.level)}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(null)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Risk Level Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          {chartData.map((item, index) => {
            const config = RISK_CONFIG[item.level.toLowerCase()] || RISK_CONFIG.undefined;
            const Icon = config.icon;
            return (
              <div
                key={item.level}
                className={`p-3 rounded-lg ${config.bgColor} cursor-pointer transition-all duration-200 hover:scale-105 ${
                  activeIndex === index ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                }`}
                onClick={() => onRiskLevelClick?.(item.level)}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`h-5 w-5 ${config.textColor}`} />
                  <span className={`text-sm font-medium ${config.textColor}`}>
                    {config.label}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      {item.count}
                    </span>
                    <span className="text-xs text-gray-500">clients</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {item.amount.toLocaleString("fr-FR")} {currency}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-4 flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Total clients</span>
          </div>
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            {totalClients} clients • {totalAmount.toLocaleString("fr-FR")} {currency}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
