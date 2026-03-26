"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/analytics/calculations";
import {
  Clock,
  AlertTriangle,
  AlertCircle,
  Calendar,
  TrendingUp,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface AgingBucketData {
  range: string;
  label: string;
  count: number;
  amount: number;
  percentage: number;
  color: string;
}

interface AgingReportProps {
  data: AgingBucketData[];
  title?: string;
  description?: string;
  loading?: boolean;
  currency?: string;
  onBucketClick?: (bucket: AgingBucketData) => void;
}

const bucketIcons = {
  "0-7": CheckCircle,
  "8-14": Calendar,
  "15-30": Clock,
  "31-60": AlertTriangle,
  "60+": AlertCircle,
};

export function AgingReport({
  data,
  title = "Rapport de vieillissement",
  description = "Créances par ancienneté",
  loading = false,
  currency = "GNF",
  onBucketClick,
}: AgingReportProps) {
  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalAmount = data.reduce((sum, b) => sum + b.amount, 0);
  const totalCount = data.reduce((sum, b) => sum + b.count, 0);
  const criticalAmount = data
    .filter((b) => b.range === "31-60" || b.range === "60+")
    .reduce((sum, b) => sum + b.amount, 0);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5 text-orange-500" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-lg font-bold">{totalCount}</p>
            <p className="text-xs text-muted-foreground">créances</p>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">Montant</p>
            <p className="text-lg font-bold">{formatCurrency(totalAmount, currency)}</p>
          </div>
          <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-xs text-muted-foreground">Critique</p>
            <p className="text-lg font-bold text-red-600 dark:text-red-400">
              {formatCurrency(criticalAmount, currency)}
            </p>
          </div>
        </div>

        {/* Aging buckets */}
        <div className="space-y-3">
          {data.map((bucket, index) => {
            const Icon = bucketIcons[bucket.range as keyof typeof bucketIcons] || Clock;
            const isCritical = bucket.range === "31-60" || bucket.range === "60+";

            return (
              <div
                key={bucket.range}
                className={cn(
                  "p-3 rounded-lg border transition-all cursor-pointer",
                  isCritical && bucket.amount > 0
                    ? "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20"
                    : "border-border hover:bg-muted/50"
                )}
                onClick={() => onBucketClick?.(bucket)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="p-1.5 rounded"
                      style={{ backgroundColor: bucket.color + "20" }}
                    >
                      <Icon className="h-4 w-4" style={{ color: bucket.color }} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{bucket.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {bucket.count} créance{bucket.count > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm" style={{ color: bucket.color }}>
                      {formatCurrency(bucket.amount, currency)}
                    </p>
                    <p className="text-xs text-muted-foreground">{bucket.percentage}%</p>
                  </div>
                </div>

                {/* Progress bar */}
                <Progress
                  value={bucket.percentage}
                  className="h-2"
                  style={{
                    backgroundColor: bucket.color + "20",
                  }}
                />

                {/* Warning for critical buckets */}
                {isCritical && bucket.amount > 0 && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-red-600 dark:text-red-400">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Attention: nécessite une action prioritaire</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Visual indicator */}
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-muted-foreground mb-2">Distribution visuelle</p>
          <div className="flex h-4 rounded-full overflow-hidden">
            {data.map((bucket, index) => (
              <div
                key={bucket.range}
                className="h-full transition-all hover:opacity-80"
                style={{
                  width: `${bucket.percentage}%`,
                  backgroundColor: bucket.color,
                }}
                title={`${bucket.label}: ${bucket.percentage}%`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
            <span>0 jours</span>
            <span>60+ jours</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Compact version for dashboard
export function AgingReportCompact({
  data,
  currency = "GNF",
}: {
  data: AgingBucketData[];
  currency?: string;
}) {
  return (
    <div className="space-y-2">
      {data.slice(0, 4).map((bucket) => (
        <div
          key={bucket.range}
          className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: bucket.color }}
            />
            <span className="text-sm">{bucket.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{bucket.count}</span>
            <span className="text-sm font-semibold">
              {formatCurrency(bucket.amount, currency)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// Skeleton component
export function AgingReportSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32 mt-1" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
