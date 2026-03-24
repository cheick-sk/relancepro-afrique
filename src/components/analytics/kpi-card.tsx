"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  LucideIcon,
} from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

export interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  change?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  trend?: "up" | "down" | "neutral";
  progress?: number; // 0-100
  sparklineData?: { value: number }[];
  alert?: boolean;
  alertLabel?: string;
  loading?: boolean;
  className?: string;
}

function formatTrendValue(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return value.toString();
}

export function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "text-orange-600",
  iconBgColor = "bg-orange-100 dark:bg-orange-900/30",
  change,
  trend,
  progress,
  sparklineData,
  alert,
  alertLabel = "Urgent",
  loading = false,
  className,
}: KPICardProps) {
  if (loading) {
    return (
      <Card className={cn("relative overflow-hidden", className)}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-lg bg-gray-200 dark:bg-gray-700" />
              <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
            <div className="space-y-2">
              <div className="h-7 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
            {sparklineData && (
              <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded" />
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getTrendIcon = () => {
    if (trend === "up" || change?.isPositive) {
      return <ArrowUpRight className="h-3 w-3" />;
    }
    if (trend === "down" || (change && !change.isPositive)) {
      return <ArrowDownRight className="h-3 w-3" />;
    }
    return <Minus className="h-3 w-3" />;
  };

  const getTrendColor = () => {
    if (trend === "up" || change?.isPositive) {
      return "text-green-600 dark:text-green-400";
    }
    if (trend === "down" || (change && !change.isPositive)) {
      return "text-red-600 dark:text-red-400";
    }
    return "text-gray-500";
  };

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-200 hover:shadow-lg group",
        alert && "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20",
        className
      )}
    >
      <CardContent className="p-6">
        {/* Header with Icon and Alert */}
        <div className="flex items-center justify-between mb-4">
          <div className={cn("p-2.5 rounded-xl transition-transform group-hover:scale-105", iconBgColor)}>
            <Icon className={cn("h-5 w-5", iconColor)} />
          </div>
          <div className="flex items-center gap-2">
            {change && (
              <div
                className={cn(
                  "flex items-center text-xs font-semibold px-2 py-1 rounded-full",
                  change.isPositive
                    ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                    : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                )}
              >
                {getTrendIcon()}
                <span className="ml-0.5">{formatTrendValue(change.value)}%</span>
              </div>
            )}
            {alert && (
              <Badge variant="destructive" className="text-xs animate-pulse">
                {alertLabel}
              </Badge>
            )}
          </div>
        </div>

        {/* Value and Title */}
        <div className="space-y-1">
          <p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            {value}
          </p>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
            {title}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {subtitle}
            </p>
          )}
        </div>

        {/* Progress Bar */}
        {progress !== undefined && progress >= 0 && (
          <div className="mt-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">Progression</span>
              <span className={cn(
                "font-medium",
                progress >= 80 ? "text-green-600 dark:text-green-400" :
                progress >= 50 ? "text-amber-600 dark:text-amber-400" :
                "text-red-600 dark:text-red-400"
              )}>
                {progress}%
              </span>
            </div>
            <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700 ease-out",
                  progress >= 80 ? "bg-green-500" :
                  progress >= 50 ? "bg-amber-500" :
                  "bg-red-500"
                )}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Sparkline Mini Chart */}
        {sparklineData && sparklineData.length > 0 && (
          <div className="mt-4 h-12 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={sparklineData}
                margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#f97316"
                  fill="url(#sparklineGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Grid wrapper for multiple KPI cards
export interface KPIGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4 | 6;
  className?: string;
}

export function KPIGrid({ children, columns = 6, className }: KPIGridProps) {
  const gridCols = {
    2: "md:grid-cols-2",
    3: "md:grid-cols-2 lg:grid-cols-3",
    4: "md:grid-cols-2 lg:grid-cols-4",
    6: "md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6",
  };

  return (
    <div className={cn(`grid gap-4 ${gridCols[columns]}`, className)}>
      {children}
    </div>
  );
}
