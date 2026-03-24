"use client";

import { useState, useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Sector,
  RadialBarChart,
  RadialBar,
  Legend,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  PieChartIcon,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Coins,
  TrendingUp,
  LayoutGrid,
  BarChart3,
} from "lucide-react";

interface DebtStatusData {
  name: string;
  value: number;
  amount: number;
  color: string;
  percentage: number;
  status?: string;
}

interface DebtStatusChartProps {
  data: DebtStatusData[];
  loading?: boolean;
  currency?: string;
}

const STATUS_CONFIG: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; color: string; label: string; description: string }
> = {
  pending: {
    icon: Clock,
    color: "#f59e0b",
    label: "En attente",
    description: "Créances non encore payées",
  },
  paid: {
    icon: CheckCircle2,
    color: "#22c55e",
    label: "Payées",
    description: "Créances entièrement réglées",
  },
  partial: {
    icon: Coins,
    color: "#3b82f6",
    label: "Partielles",
    description: "Paiements partiels reçus",
  },
  disputed: {
    icon: AlertCircle,
    color: "#f97316",
    label: "Contestées",
    description: "En cours de négociation",
  },
  cancelled: {
    icon: XCircle,
    color: "#6b7280",
    label: "Annulées",
    description: "Créances annulées",
  },
};

const CustomTooltip = ({
  active,
  payload,
  currency,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: DebtStatusData }>;
  currency?: string;
}) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const config = STATUS_CONFIG[data.status || data.name.toLowerCase()] || STATUS_CONFIG.pending;
    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 min-w-[200px]">
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: data.color }}
          />
          <span className="font-semibold text-gray-900 dark:text-white">{data.name}</span>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">Nombre:</span>
            <span className="font-medium text-gray-900 dark:text-white">{data.value}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">Montant:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {data.amount.toLocaleString("fr-FR")} {currency}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">Pourcentage:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {data.percentage.toFixed(1)}%
            </span>
          </div>
          <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-400">{config.description}</p>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// Active shape for animation
const renderActiveShape = (props: {
  cx: number;
  cy: number;
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
  fill: string;
  payload: DebtStatusData;
  midAngle: number;
}) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, midAngle } = props;

  const RADIAN = Math.PI / 180;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? "start" : "end";

  return (
    <g>
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
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text
        x={ex + (cos >= 0 ? 1 : -1) * 12}
        y={ey}
        textAnchor={textAnchor}
        fill="#374151"
        className="text-sm font-medium"
      >
        {payload.name}
      </text>
      <text
        x={ex + (cos >= 0 ? 1 : -1) * 12}
        y={ey}
        dy={18}
        textAnchor={textAnchor}
        fill="#6b7280"
        className="text-xs"
      >
        {`${payload.value} créances (${payload.percentage.toFixed(1)}%)`}
      </text>
    </g>
  );
};

export function DebtStatusChart({ data, loading, currency = "GNF" }: DebtStatusChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"donut" | "radial">("donut");

  // Calculate totals
  const totals = useMemo(() => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);
    const paidData = data.find((d) => d.status === "paid" || d.name.toLowerCase() === "payées");
    const pendingData = data.find((d) => d.status === "pending" || d.name.toLowerCase() === "en attente");
    const collectionRate = total > 0 && paidData ? Math.round((paidData.value / total) * 100) : 0;

    return {
      total,
      totalAmount,
      collectionRate,
      paidAmount: paidData?.amount || 0,
      pendingAmount: pendingData?.amount || 0,
    };
  }, [data]);

  if (loading) {
    return (
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5 text-orange-500" />
            Répartition par Statut
          </CardTitle>
          <CardDescription>Chargement des données...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare radial bar data
  const radialData = data.map((item) => ({
    name: item.name,
    value: item.percentage,
    fill: item.color,
    count: item.value,
    amount: item.amount,
  }));

  return (
    <Card className="col-span-1">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-orange-500" />
              Répartition par Statut
            </CardTitle>
            <CardDescription>Distribution des créances selon leur statut</CardDescription>
          </div>
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 p-1">
            <Button
              variant={viewMode === "donut" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("donut")}
              className={viewMode === "donut" ? "bg-orange-500 hover:bg-orange-600" : ""}
            >
              <PieChartIcon className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "radial" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("radial")}
              className={viewMode === "radial" ? "bg-orange-500 hover:bg-orange-600" : ""}
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="p-3 rounded-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/30 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-xs text-green-700 dark:text-green-400">Payées</span>
            </div>
            <p className="text-lg font-bold text-green-700 dark:text-green-300">
              {totals.collectionRate}%
            </p>
          </div>
          <div className="p-3 rounded-lg bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-900/30 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-amber-600" />
              <span className="text-xs text-amber-700 dark:text-amber-400">En attente</span>
            </div>
            <p className="text-lg font-bold text-amber-700 dark:text-amber-300">
              {totals.total - (data.find((d) => d.status === "paid")?.value || 0)}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-900/30 border border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-orange-600" />
              <span className="text-xs text-orange-700 dark:text-orange-400">Total</span>
            </div>
            <p className="text-lg font-bold text-orange-700 dark:text-orange-300">
              {totals.total}
            </p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-[280px]">
          {viewMode === "donut" ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  activeIndex={activeIndex ?? undefined}
                  activeShape={activeIndex !== null ? renderActiveShape : undefined}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      className="cursor-pointer transition-all duration-200 hover:opacity-80"
                      stroke="none"
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip currency={currency} />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius="20%"
                outerRadius="90%"
                data={radialData}
                startAngle={180}
                endAngle={0}
              >
                {radialData.map((entry, index) => (
                  <RadialBar
                    key={`radial-${index}`}
                    minAngle={15}
                    background
                    clockWise
                    dataKey="value"
                    fill={entry.fill}
                  />
                ))}
                <Tooltip
                  formatter={(value: number, name: string, props: { payload: { count: number; amount: number } }) => [
                    `${value}% (${props.payload.count} créances)`,
                    name,
                  ]}
                />
              </RadialBarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          {data.map((item, index) => {
            const config = STATUS_CONFIG[item.status || item.name.toLowerCase()] || STATUS_CONFIG.pending;
            const Icon = config.icon;
            const isActive = activeIndex === index;
            return (
              <div
                key={item.name}
                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all duration-200 ${
                  isActive
                    ? "bg-gray-100 dark:bg-gray-700 ring-2 ring-offset-1"
                    : "bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
                style={{ ringColor: item.color }}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {item.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {item.value} ({item.percentage.toFixed(0)}%)
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Total Amount Footer */}
        <div className="mt-4 p-4 rounded-lg bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950 border border-orange-200 dark:border-orange-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total créances</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totals.total}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400">Montant total</p>
              <p className="text-2xl font-bold text-orange-600">
                {totals.totalAmount.toLocaleString("fr-FR")} {currency}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
