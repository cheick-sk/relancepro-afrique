"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Receipt,
  TrendingUp,
  Percent,
  Users,
  Clock,
  CalendarDays,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  AlertTriangle,
  UserCheck,
  Timer,
} from "lucide-react";

interface KPIStats {
  totalDebts: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  clientCount: number;
  activeClientsCount: number;
  overdueDebtsCount: number;
  reminderCount: number;
  recoveryRate: number;
  avgPaymentProbability: number;
  avgDaysToPayment: number;
}

interface KPICardsProps {
  stats: KPIStats;
  loading?: boolean;
  previousStats?: {
    totalAmount?: number;
    paidAmount?: number;
    recoveryRate?: number;
  };
  currency?: string;
  locale?: string;
}

function formatCurrency(value: number, currency: string = "GNF"): string {
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(1)}Md ${currency}`;
  }
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M ${currency}`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K ${currency}`;
  }
  return `${value.toLocaleString("fr-FR")} ${currency}`;
}

function calculateChange(
  current: number,
  previous?: number
): { value: number; isPositive: boolean } | null {
  if (previous === undefined || previous === 0) return null;
  const change = ((current - previous) / previous) * 100;
  return {
    value: Math.abs(Math.round(change)),
    isPositive: change >= 0,
  };
}

export function KPICards({
  stats,
  loading,
  previousStats,
  currency = "GNF",
}: KPICardsProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-3" />
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const kpis = [
    {
      id: "total-debts",
      title: "Total Créances",
      value: formatCurrency(stats.totalAmount, currency),
      subtitle: `${stats.totalDebts} créance${stats.totalDebts > 1 ? "s" : ""}`,
      icon: Receipt,
      color: "text-orange-600",
      bgColor: "bg-orange-100 dark:bg-orange-900/30",
      change: calculateChange(stats.totalAmount, previousStats?.totalAmount),
      trend: "up" as const,
    },
    {
      id: "collected",
      title: "Montant Récupéré",
      value: formatCurrency(stats.paidAmount, currency),
      subtitle: `${stats.recoveryRate}% du total`,
      icon: Wallet,
      color: "text-green-600",
      bgColor: "bg-green-100 dark:bg-green-900/30",
      change: calculateChange(stats.paidAmount, previousStats?.paidAmount),
      trend: "up" as const,
    },
    {
      id: "recovery-rate",
      title: "Taux de Recouvrement",
      value: `${stats.recoveryRate}%`,
      subtitle: "Objectif: 80%",
      icon: TrendingUp,
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
      change: calculateChange(stats.recoveryRate, previousStats?.recoveryRate),
      progress: stats.recoveryRate,
      trend: stats.recoveryRate >= 80 ? "up" as const : "neutral" as const,
    },
    {
      id: "active-clients",
      title: "Clients Actifs",
      value: stats.activeClientsCount.toString(),
      subtitle: `sur ${stats.clientCount} total`,
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-100 dark:bg-purple-900/30",
      trend: "neutral" as const,
    },
    {
      id: "overdue-debts",
      title: "Créances en Retard",
      value: stats.overdueDebtsCount.toString(),
      subtitle: formatCurrency(stats.overdueAmount, currency),
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-100 dark:bg-red-900/30",
      isAlert: stats.overdueDebtsCount > 0,
      trend: stats.overdueDebtsCount > 5 ? "down" as const : "neutral" as const,
    },
    {
      id: "avg-days",
      title: "Délai Moyen Paiement",
      value: `${stats.avgDaysToPayment}j`,
      subtitle: "jours en moyenne",
      icon: Timer,
      color: "text-cyan-600",
      bgColor: "bg-cyan-100 dark:bg-cyan-900/30",
      trend: stats.avgDaysToPayment <= 30 ? "up" as const : stats.avgDaysToPayment <= 60 ? "neutral" as const : "down" as const,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {kpis.map((kpi) => (
        <Card
          key={kpi.id}
          className={`relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:scale-[1.02] ${
            kpi.isAlert ? "border-red-200 dark:border-red-800 animate-pulse" : ""
          }`}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              </div>
              <div className="flex items-center gap-1">
                {kpi.change && (
                  <div
                    className={`flex items-center text-xs font-medium px-1.5 py-0.5 rounded-full ${
                      kpi.change.isPositive
                        ? "text-green-600 bg-green-100 dark:bg-green-900/30"
                        : "text-red-600 bg-red-100 dark:bg-red-900/30"
                    }`}
                  >
                    {kpi.change.isPositive ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    {kpi.change.value}%
                  </div>
                )}
                {kpi.isAlert && (
                  <Badge variant="destructive" className="text-xs animate-bounce">
                    Urgent
                  </Badge>
                )}
              </div>
            </div>

            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white truncate">
                {kpi.value}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{kpi.title}</p>
              {kpi.subtitle && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">
                  {kpi.subtitle}
                </p>
              )}
            </div>

            {kpi.progress !== undefined && (
              <div className="mt-3">
                <Progress
                  value={kpi.progress}
                  className={`h-2 ${
                    kpi.progress >= 80
                      ? "[&>div]:bg-green-500"
                      : kpi.progress >= 50
                      ? "[&>div]:bg-amber-500"
                      : "[&>div]:bg-red-500"
                  }`}
                />
                <div className="flex justify-between mt-1 text-xs text-gray-400">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>
            )}

            {/* Trend indicator */}
            <div className="mt-2 flex items-center gap-1">
              {kpi.trend === "up" && (
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <TrendingUp className="h-3 w-3" />
                  <span>Bon</span>
                </div>
              )}
              {kpi.trend === "down" && (
                <div className="flex items-center gap-1 text-xs text-red-600">
                  <ArrowDownRight className="h-3 w-3" />
                  <span>À surveiller</span>
                </div>
              )}
              {kpi.trend === "neutral" && (
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Percent className="h-3 w-3" />
                  <span>Normal</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
