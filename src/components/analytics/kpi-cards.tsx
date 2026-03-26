"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Receipt,
  Banknote,
  Percent,
  Users,
  Mail,
  Clock,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/analytics/calculations";

export interface KPICardData {
  id: string;
  title: string;
  value: string;
  trend?: number;
  trendDirection?: "up" | "down" | "neutral";
  trendLabel?: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  sparkline?: number[];
}

interface KPICardsProps {
  data: KPICardData[];
  loading?: boolean;
  onCardClick?: (kpi: KPICardData) => void;
}

export function KPICards({ data, loading = false, onCardClick }: KPICardsProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-24 mb-1" />
              <Skeleton className="h-3 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
      {data.map((kpi) => (
        <KPICard key={kpi.id} kpi={kpi} onClick={() => onCardClick?.(kpi)} />
      ))}
    </div>
  );
}

interface KPICardProps {
  kpi: KPICardData;
  onClick?: () => void;
}

export function KPICard({ kpi, onClick }: KPICardProps) {
  const {
    title,
    value,
    trend,
    trendDirection = "neutral",
    trendLabel,
    icon: Icon,
    color,
    bgColor,
  } = kpi;

  const trendColor =
    trendDirection === "up"
      ? "text-green-600 dark:text-green-400"
      : trendDirection === "down"
      ? "text-red-600 dark:text-red-400"
      : "text-gray-500 dark:text-gray-400";

  const TrendIcon =
    trendDirection === "up"
      ? TrendingUp
      : trendDirection === "down"
      ? TrendingDown
      : Minus;

  return (
    <Card
      className={cn(
        "transition-all hover:shadow-md",
        onClick && "cursor-pointer hover:border-orange-300 dark:hover:border-orange-700"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className={cn("p-2 rounded-lg", bgColor)}>
            <Icon className={cn("h-4 w-4", color)} />
          </div>
          {trend !== undefined && (
            <div className={cn("flex items-center gap-0.5 text-xs", trendColor)}>
              <TrendIcon className="h-3 w-3" />
              <span className="font-medium">{Math.abs(trend)}%</span>
            </div>
          )}
        </div>

        <div>
          <p className="text-xl font-bold text-gray-900 dark:text-white truncate">
            {value}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
            {title}
          </p>
          {trendLabel && (
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">
              {trendLabel}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Helper function to generate default KPI data from analytics
export function generateKPIData(analytics: {
  summary: {
    totalAmount: number;
    paidAmount: number;
    reminderCount: number;
    previousTotalAmount?: number;
    previousPaidAmount?: number;
    previousReminderCount?: number;
  };
  kpis: {
    recoveryRate: number;
    previousRecoveryRate?: number;
    avgPaymentDelay: number;
    totalClients: number;
    activeClients: number;
    overdueCount: number;
  };
}, currency: string = "GNF"): KPICardData[] {
  const calculateTrend = (current: number, previous: number | undefined) => {
    if (!previous || previous === 0) return { value: undefined, direction: "neutral" as const };
    const change = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(Math.round(change)),
      direction: change > 0 ? "up" as const : change < 0 ? "down" as const : "neutral" as const,
    };
  };

  const totalTrend = calculateTrend(analytics.summary.totalAmount, analytics.summary.previousTotalAmount);
  const paidTrend = calculateTrend(analytics.summary.paidAmount, analytics.summary.previousPaidAmount);
  const reminderTrend = calculateTrend(analytics.summary.reminderCount, analytics.summary.previousReminderCount);
  const recoveryTrend = analytics.kpis.previousRecoveryRate
    ? {
        value: Math.abs(analytics.kpis.recoveryRate - analytics.kpis.previousRecoveryRate),
        direction:
          analytics.kpis.recoveryRate > analytics.kpis.previousRecoveryRate
            ? "up" as const
            : analytics.kpis.recoveryRate < analytics.kpis.previousRecoveryRate
            ? "down" as const
            : "neutral" as const,
      }
    : { value: undefined, direction: "neutral" as const };

  return [
    {
      id: "total-debts",
      title: "Créances totales",
      value: formatCurrency(analytics.summary.totalAmount, currency),
      trend: totalTrend.value,
      trendDirection: totalTrend.direction,
      trendLabel: "vs période préc.",
      icon: Receipt,
      color: "text-orange-600",
      bgColor: "bg-orange-100 dark:bg-orange-900/30",
    },
    {
      id: "recovered",
      title: "Montant récupéré",
      value: formatCurrency(analytics.summary.paidAmount, currency),
      trend: paidTrend.value,
      trendDirection: paidTrend.direction,
      trendLabel: "vs période préc.",
      icon: Banknote,
      color: "text-green-600",
      bgColor: "bg-green-100 dark:bg-green-900/30",
    },
    {
      id: "recovery-rate",
      title: "Taux de recouvrement",
      value: `${analytics.kpis.recoveryRate}%`,
      trend: recoveryTrend.value,
      trendDirection: recoveryTrend.direction,
      trendLabel: "points",
      icon: Percent,
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      id: "clients",
      title: "Nombre de clients",
      value: analytics.kpis.totalClients.toString(),
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-100 dark:bg-purple-900/30",
    },
    {
      id: "reminders",
      title: "Relances envoyées",
      value: analytics.summary.reminderCount.toString(),
      trend: reminderTrend.value,
      trendDirection: reminderTrend.direction,
      trendLabel: "vs période préc.",
      icon: Mail,
      color: "text-pink-600",
      bgColor: "bg-pink-100 dark:bg-pink-900/30",
    },
    {
      id: "avg-payment",
      title: "Temps moyen paiement",
      value: `${analytics.kpis.avgPaymentDelay}j`,
      icon: Clock,
      color: "text-cyan-600",
      bgColor: "bg-cyan-100 dark:bg-cyan-900/30",
    },
    {
      id: "overdue",
      title: "Créances en retard",
      value: analytics.kpis.overdueCount.toString(),
      icon: TrendingUp,
      color: "text-red-600",
      bgColor: "bg-red-100 dark:bg-red-900/30",
    },
  ];
}

// Skeleton loading component
export function KPICardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
      {Array.from({ length: 7 }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-4 w-10" />
            </div>
            <Skeleton className="h-7 w-24 mb-1" />
            <Skeleton className="h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
