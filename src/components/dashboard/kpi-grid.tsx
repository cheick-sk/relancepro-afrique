"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Percent,
  Users,
  Receipt,
  Timer,
  Target,
  DollarSign,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
} from "recharts";

export interface KPIData {
  id: string;
  title: string;
  value: string;
  description: string;
  trend?: number;
  trendLabel?: string;
  sparklineData?: { value: number }[];
  icon: LucideIcon;
  color: string;
  bgColor: string;
  onClick?: () => void;
}

interface KPIGridProps {
  kpis: KPIData[];
  title?: string;
}

export function KPIGrid({ kpis, title = "Indicateurs clés de performance" }: KPIGridProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {kpis.map((kpi) => (
            <KPICard key={kpi.id} kpi={kpi} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface KPICardProps {
  kpi: KPIData;
}

export function KPICard({ kpi }: KPICardProps) {
  const {
    title,
    value,
    description,
    trend,
    trendLabel,
    sparklineData,
    icon: Icon,
    color,
    bgColor,
    onClick,
  } = kpi;

  const trendColor =
    trend && trend > 0
      ? "text-green-600"
      : trend && trend < 0
      ? "text-red-600"
      : "text-gray-500";
  const TrendIcon =
    trend && trend > 0 ? TrendingUp : trend && trend < 0 ? TrendingDown : Minus;

  return (
    <div
      className={cn(
        "p-4 rounded-lg border bg-gray-50 dark:bg-gray-800/50 transition-all",
        onClick && "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-orange-300"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className={cn("p-2 rounded-lg", bgColor)}>
          <Icon className={cn("h-4 w-4", color)} />
        </div>
        {trend !== undefined && (
          <div className={cn("flex items-center gap-1 text-xs", trendColor)}>
            <TrendIcon className="h-3 w-3" />
            <span className="font-medium">{Math.abs(trend)}%</span>
          </div>
        )}
      </div>

      <div className="mt-3">
        <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1">
          {title}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {description}
        </p>
        {trendLabel && (
          <p className="text-xs text-gray-400 mt-1">{trendLabel}</p>
        )}
      </div>

      {sparklineData && sparklineData.length > 0 && (
        <div className="mt-3 h-8">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparklineData}>
              <defs>
                <linearGradient
                  id={`gradient-kpi-${title}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={color.replace("text-", "").replace("-600", "-500")}
                    stopOpacity={0.2}
                  />
                  <stop
                    offset="95%"
                    stopColor={color.replace("text-", "").replace("-600", "-500")}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={color.replace("text-", "").replace("-600", "-500")}
                strokeWidth={1.5}
                fill={`url(#gradient-kpi-${title})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// Default KPIs for RelancePro Africa
export function getDefaultKPIs(data: {
  recoveryRate: number;
  avgPaymentDelay: number;
  responseRate: number;
  avgDebtAmount: number;
  activeClients: number;
  roiPercentage: number;
  previousRecoveryRate?: number;
  previousAvgPaymentDelay?: number;
  previousResponseRate?: number;
  previousActiveClients?: number;
}): KPIData[] {
  const formatGNF = (amount: number) => {
    return new Intl.NumberFormat("fr-GN", {
      style: "decimal",
      maximumFractionDigits: 0,
    }).format(amount) + " GNF";
  };

  const calculateTrend = (current: number, previous: number | undefined) => {
    if (previous === undefined || previous === 0) return undefined;
    return Math.round(((current - previous) / previous) * 100);
  };

  return [
    {
      id: "recovery-rate",
      title: "Taux de recouvrement global",
      value: `${data.recoveryRate}%`,
      description: "Pourcentage total récupéré",
      trend: data.previousRecoveryRate
        ? data.recoveryRate - data.previousRecoveryRate
        : undefined,
      trendLabel: "pts vs période préc.",
      icon: Target,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      id: "avg-delay",
      title: "Délai moyen de paiement",
      value: `${data.avgPaymentDelay} jours`,
      description: "Temps moyen de recouvrement",
      trend: data.previousAvgPaymentDelay
        ? calculateTrend(data.avgPaymentDelay, data.previousAvgPaymentDelay)
        : undefined,
      trendLabel: "vs période précédente",
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      id: "response-rate",
      title: "Taux de réponse aux relances",
      value: `${data.responseRate}%`,
      description: "Clients ayant répondu",
      icon: Percent,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      id: "avg-debt",
      title: "Montant moyen par créance",
      value: formatGNF(data.avgDebtAmount),
      description: "Valeur moyenne des créances",
      icon: DollarSign,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      id: "active-clients",
      title: "Clients actifs",
      value: data.activeClients.toString(),
      description: "Clients avec créances actives",
      trend: calculateTrend(data.activeClients, data.previousActiveClients),
      trendLabel: "vs période précédente",
      icon: Users,
      color: "text-cyan-600",
      bgColor: "bg-cyan-100",
    },
    {
      id: "roi",
      title: "ROI",
      value: `${data.roiPercentage}%`,
      description: "Temps gagné vs coût abonnement",
      icon: Timer,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100",
    },
  ];
}
