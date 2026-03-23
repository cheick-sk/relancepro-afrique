"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/analytics/calculations";
import {
  Users,
  ExternalLink,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import Link from "next/link";

export interface TopDebtorData {
  id: string;
  name: string;
  fullName?: string;
  amount: number;
  paid: number;
  count: number;
  daysOverdue?: number;
  riskScore?: number;
  riskLevel?: "low" | "medium" | "high" | null;
}

interface TopDebtorsTableProps {
  data: TopDebtorData[];
  title?: string;
  description?: string;
  loading?: boolean;
  currency?: string;
  maxItems?: number;
}

const riskColors = {
  high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  low: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

const riskLabels = {
  high: "Élevé",
  medium: "Moyen",
  low: "Faible",
};

export function TopDebtorsTable({
  data,
  title = "Top débiteurs",
  description = "Clients avec les plus gros montants impayés",
  loading = false,
  currency = "GNF",
  maxItems = 10,
}: TopDebtorsTableProps) {
  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayData = data.slice(0, maxItems);
  const totalAmount = displayData.reduce((sum, d) => sum + d.amount, 0);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5 text-orange-500" />
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Link href="/clients">
            <Button variant="ghost" size="sm" className="text-orange-500 hover:text-orange-600">
              Voir tout
              <ExternalLink className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {/* Total summary */}
        <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total impayé (Top {displayData.length})</span>
            <span className="font-bold text-orange-600 dark:text-orange-400">
              {formatCurrency(totalAmount, currency)}
            </span>
          </div>
        </div>

        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">#</TableHead>
                <TableHead className="font-semibold">Client</TableHead>
                <TableHead className="font-semibold text-right">Montant</TableHead>
                <TableHead className="font-semibold text-center">Jours</TableHead>
                <TableHead className="font-semibold text-center">Risque</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Aucun débiteur à afficher
                  </TableCell>
                </TableRow>
              ) : (
                displayData.map((debtor, index) => {
                  const progressPercentage = totalAmount > 0 
                    ? Math.round((debtor.amount / totalAmount) * 100) 
                    : 0;
                  
                  return (
                    <TableRow
                      key={debtor.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <TableCell className="font-medium text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium truncate max-w-[120px]" title={debtor.fullName || debtor.name}>
                            {debtor.name}
                          </span>
                          {debtor.count > 1 && (
                            <span className="text-xs text-muted-foreground">
                              {debtor.count} créances
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-semibold">{formatCurrency(debtor.amount, currency)}</span>
                          <div className="w-16 mt-1">
                            <Progress 
                              value={progressPercentage} 
                              className="h-1"
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {debtor.daysOverdue !== undefined ? (
                          <div className="flex items-center justify-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span
                              className={
                                debtor.daysOverdue > 60
                                  ? "text-red-600 font-medium"
                                  : debtor.daysOverdue > 30
                                  ? "text-amber-600"
                                  : ""
                              }
                            >
                              {debtor.daysOverdue}j
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {debtor.riskLevel ? (
                          <Badge
                            variant="secondary"
                            className={riskColors[debtor.riskLevel]}
                          >
                            {riskLabels[debtor.riskLevel]}
                          </Badge>
                        ) : debtor.riskScore !== undefined ? (
                          <div className="flex items-center justify-center gap-1">
                            {debtor.riskScore >= 70 ? (
                              <TrendingUp className="h-3 w-3 text-red-500" />
                            ) : debtor.riskScore >= 40 ? (
                              <Minus className="h-3 w-3 text-amber-500" />
                            ) : (
                              <TrendingDown className="h-3 w-3 text-green-500" />
                            )}
                            <span className="text-xs">{debtor.riskScore}%</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Link href={`/clients/${debtor.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// Compact card version for dashboards
export function TopDebtorsCompact({
  data,
  currency = "GNF",
}: {
  data: TopDebtorData[];
  currency?: string;
}) {
  const displayData = data.slice(0, 5);

  return (
    <div className="space-y-2">
      {displayData.map((debtor, index) => (
        <div
          key={debtor.id}
          className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-4">{index + 1}.</span>
            <span className="font-medium text-sm truncate max-w-[100px]">{debtor.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{formatCurrency(debtor.amount, currency)}</span>
            {debtor.riskLevel && (
              <div
                className={`h-2 w-2 rounded-full ${
                  debtor.riskLevel === "high"
                    ? "bg-red-500"
                    : debtor.riskLevel === "medium"
                    ? "bg-amber-500"
                    : "bg-green-500"
                }`}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Skeleton component
export function TopDebtorsTableSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32 mt-1" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-12 w-full mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
