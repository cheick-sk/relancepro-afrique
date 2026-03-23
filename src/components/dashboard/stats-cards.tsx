"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Receipt,
  Banknote,
  Percent,
  Mail,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
} from "recharts";

export interface StatCardData {
  title: string;
  value: string;
  trend?: number;
  trendLabel?: string;
  sparklineData?: { value: number }[];
  icon: LucideIcon;
  color: string;
  bgColor: string;
}

interface StatsCardsProps {
  stats: StatCardData[];
  onCardClick?: (stat: StatCardData) => void;
}

export function StatsCards({ stats, onCardClick }: StatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <StatsCard
          key={stat.title}
          stat={stat}
          onClick={() => onCardClick?.(stat)}
        />
      ))}
    </div>
  );
}

interface StatsCardProps {
  stat: StatCardData;
  onClick?: () => void;
}

export function StatsCard({ stat, onClick }: StatsCardProps) {
  const { title, value, trend, trendLabel, sparklineData, icon: Icon, color, bgColor } = stat;

  const trendColor = trend && trend > 0 ? "text-green-600" : trend && trend < 0 ? "text-red-600" : "text-gray-500";
  const TrendIcon = trend && trend > 0 ? TrendingUp : trend && trend < 0 ? TrendingDown : Minus;

  return (
    <Card
      className={cn(
        "transition-all hover:shadow-md cursor-pointer",
        onClick && "hover:border-orange-300"
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className={cn("p-2 rounded-lg", bgColor)}>
            <Icon className={cn("h-5 w-5", color)} />
          </div>
          {trend !== undefined && (
            <div className={cn("flex items-center gap-1 text-sm", trendColor)}>
              <TrendIcon className="h-4 w-4" />
              <span className="font-medium">{Math.abs(trend)}%</span>
            </div>
          )}
        </div>

        <div className="mt-4">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {title}
          </p>
          {trendLabel && (
            <p className="text-xs text-gray-400 mt-1">{trendLabel}</p>
          )}
        </div>

        {sparklineData && sparklineData.length > 0 && (
          <div className="mt-4 h-12">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData}>
                <defs>
                  <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color.replace("text-", "").replace("-600", "-500")} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={color.replace("text-", "").replace("-600", "-500")} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={color.replace("text-", "").replace("-600", "-500")}
                  strokeWidth={2}
                  fill={`url(#gradient-${title})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Default stats cards for RelancePro Africa
export function getDefaultStatsCards(data: {
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  reminderCount: number;
  previousTotalAmount?: number;
  previousPaidAmount?: number;
  previousPendingAmount?: number;
  previousReminderCount?: number;
  sparklineData?: {
    amounts: number[];
    recovered: number[];
    pending: number[];
    reminders: number[];
  };
}): StatCardData[] {
  const formatGNF = (amount: number) => {
    return new Intl.NumberFormat("fr-GN", {
      style: "decimal",
      maximumFractionDigits: 0,
    }).format(amount) + " GNF";
  };

  const calculateTrend = (current: number, previous: number | undefined) => {
    if (!previous || previous === 0) return undefined;
    return Math.round(((current - previous) / previous) * 100);
  };

  const recoveryRate = data.totalAmount > 0
    ? Math.round((data.paidAmount / data.totalAmount) * 100)
    : 0;

  const previousRecoveryRate = data.previousTotalAmount && data.previousTotalAmount > 0
    ? Math.round((data.paidAmount / data.previousTotalAmount) * 100)
    : undefined;

  return [
    {
      title: "Créances totales",
      value: formatGNF(data.totalAmount),
      trend: calculateTrend(data.totalAmount, data.previousTotalAmount),
      trendLabel: "vs période précédente",
      sparklineData: data.sparklineData?.amounts.map((v) => ({ value: v })),
      icon: Receipt,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      title: "Montant récupéré",
      value: formatGNF(data.paidAmount),
      trend: calculateTrend(data.paidAmount, data.previousPaidAmount),
      trendLabel: "vs période précédente",
      sparklineData: data.sparklineData?.recovered.map((v) => ({ value: v })),
      icon: Banknote,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Taux de recouvrement",
      value: `${recoveryRate}%`,
      trend: previousRecoveryRate ? recoveryRate - previousRecoveryRate : undefined,
      trendLabel: "points de pourcentage",
      sparklineData: data.sparklineData?.recovered.map((v, i) => ({
        value: data.sparklineData?.amounts[i]
          ? Math.round((v / data.sparklineData.amounts[i]) * 100)
          : 0,
      })),
      icon: Percent,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Relances envoyées",
      value: data.reminderCount.toString(),
      trend: calculateTrend(data.reminderCount, data.previousReminderCount),
      trendLabel: "vs période précédente",
      sparklineData: data.sparklineData?.reminders.map((v) => ({ value: v })),
      icon: Mail,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
  ];
}
