"use client";

import { useState, useEffect, useCallback } from "react";
import { DateRange } from "react-day-picker";
import { subDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  RefreshCw, 
  Download, 
  FileSpreadsheet, 
  FileText,
  Calendar as CalendarIcon,
  Coins,
  BarChart3,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { toast } from "sonner";

import { KPICards, KPICardsSkeleton, generateKPIData } from "@/components/analytics/kpi-cards";
import { RevenueChart, RevenueChartSkeleton, RevenueData } from "@/components/analytics/charts/revenue-chart";
import { DebtStatusChart, DebtStatusChartSkeleton, DebtStatusData } from "@/components/analytics/charts/debt-status-chart";
import { RemindersChart, RemindersChartSkeleton, ReminderChartData } from "@/components/analytics/charts/reminders-chart";
import { PaymentPredictionChart, PaymentPredictionChartSkeleton, PaymentPredictionData } from "@/components/analytics/charts/payment-prediction-chart";
import { ClientRiskDistribution, ClientRiskDistributionSkeleton, RiskDistributionData } from "@/components/analytics/charts/client-risk-distribution";
import { TopDebtorsTable, TopDebtorsTableSkeleton, TopDebtorData } from "@/components/analytics/top-debtors-table";
import { AgingReport, AgingReportSkeleton, AgingBucketData } from "@/components/analytics/aging-report";

// Analytics API response type
interface AnalyticsResponse {
  summary: {
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
  };
  charts: {
    recovery: Array<{
      month: string;
      recovered: number;
      total: number;
      rate: number;
    }>;
    debtStatus: DebtStatusData[];
    reminders: ReminderChartData[];
    topDebtors: TopDebtorData[];
    paymentPredictions: PaymentPredictionData[];
  };
  kpis: {
    recoveryRate: number;
    previousRecoveryRate?: number;
    avgPaymentDelay: number;
    responseRate: number;
    avgDebtAmount: number;
    activeClients: number;
    roiPercentage: number;
    totalDebts: number;
    totalClients: number;
    overdueCount: number;
  };
  alerts: {
    criticalDebts: Array<{
      id: string;
      clientName: string;
      amount: number;
      currency: string;
      daysOverdue: number;
      reference?: string;
    }>;
    overdueCount: number;
    overdueAmount: number;
  };
  aging?: AgingBucketData[];
  riskDistribution?: RiskDistributionData[];
  revenueByPeriod?: RevenueData[];
}

const currencies = [
  { value: "GNF", label: "Franc guinéen (GNF)" },
  { value: "XOF", label: "Franc CFA (XOF)" },
  { value: "XAF", label: "Franc CFA (XAF)" },
  { value: "EUR", label: "Euro (EUR)" },
  { value: "USD", label: "Dollar US (USD)" },
];

export default function AnalyticsPage() {
  // State
  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [currency, setCurrency] = useState("GNF");
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("month");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<AnalyticsResponse | null>(null);

  // Fetch analytics data
  const fetchAnalytics = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const params = new URLSearchParams();
      if (date?.from) {
        params.set("from", format(date.from, "yyyy-MM-dd"));
      }
      if (date?.to) {
        params.set("to", format(date.to, "yyyy-MM-dd"));
      }
      params.set("currency", currency);

      const response = await fetch(`/api/analytics?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Erreur lors du chargement des données");
      }

      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Erreur lors du chargement des analyses");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [date, currency]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Handle refresh
  const handleRefresh = () => {
    fetchAnalytics(true);
    toast.success("Données actualisées");
  };

  // Handle export
  const handleExport = async (format: "pdf" | "excel") => {
    try {
      toast.info(`Export ${format.toUpperCase()} en cours...`);
      
      const params = new URLSearchParams();
      if (date?.from) {
        params.set("from", format(date.from, "yyyy-MM-dd"));
      }
      if (date?.to) {
        params.set("to", format(date.to, "yyyy-MM-dd"));
      }
      params.set("currency", currency);
      params.set("format", format);

      const response = await fetch(`/api/export?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error("Erreur lors de l'export");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `relancepro-analytics-${format(new Date(), "yyyy-MM-dd")}.${format === "pdf" ? "pdf" : "xlsx"}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`Export ${format.toUpperCase()} téléchargé`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Erreur lors de l'export");
    }
  };

  // Generate KPI data
  const kpiData = data ? generateKPIData(data, currency) : [];

  // Transform revenue data
  const revenueData: RevenueData[] = data?.charts.recovery?.map((item) => ({
    period: item.month,
    revenue: item.recovered,
    previousRevenue: undefined,
    count: undefined,
  })) || [];

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-orange-500" />
            Analyses avancées
          </h1>
          <p className="text-muted-foreground mt-1">
            Tableau de bord analytique RelancePro Africa
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Range Picker */}
          <DateRangePicker date={date} onDateChange={setDate} />

          {/* Currency Selector */}
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger className="w-[140px] bg-white dark:bg-gray-800">
              <Coins className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Devise" />
            </SelectTrigger>
            <SelectContent>
              {currencies.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-white dark:bg-gray-800"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>

          {/* Export Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default" className="bg-orange-500 hover:bg-orange-600">
                <Download className="h-4 w-4 mr-2" />
                Exporter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport("pdf")}>
                <FileText className="h-4 w-4 mr-2" />
                Exporter en PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("excel")}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Exporter en Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <KPICardsSkeleton />
      ) : (
        <KPICards data={kpiData} />
      )}

      {/* Charts Row 1 */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Revenue Chart */}
        {loading ? (
          <RevenueChartSkeleton />
        ) : (
          <RevenueChart
            data={revenueData}
            groupBy={groupBy}
            onGroupByChange={setGroupBy}
            currency={currency}
            className="lg:col-span-2"
          />
        )}

        {/* Debt Status Chart */}
        {loading ? (
          <DebtStatusChartSkeleton />
        ) : (
          <DebtStatusChart
            data={data?.charts.debtStatus || []}
            currency={currency}
          />
        )}
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Reminders Chart */}
        {loading ? (
          <RemindersChartSkeleton />
        ) : (
          <RemindersChart data={data?.charts.reminders || []} />
        )}

        {/* Payment Prediction Chart */}
        {loading ? (
          <PaymentPredictionChartSkeleton />
        ) : (
          <PaymentPredictionChart
            data={data?.charts.paymentPredictions || []}
            currency={currency}
          />
        )}
      </div>

      {/* Charts Row 3 */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Client Risk Distribution */}
        {loading ? (
          <ClientRiskDistributionSkeleton />
        ) : (
          <ClientRiskDistribution
            data={data?.riskDistribution || []}
            currency={currency}
          />
        )}

        {/* Top Debtors Table */}
        {loading ? (
          <TopDebtorsTableSkeleton />
        ) : (
          <TopDebtorsTable
            data={data?.charts.topDebtors || []}
            currency={currency}
            className="lg:col-span-2"
          />
        )}
      </div>

      {/* Aging Report */}
      <div className="grid gap-6 md:grid-cols-1">
        {loading ? (
          <AgingReportSkeleton />
        ) : (
          <AgingReport
            data={data?.aging || []}
            currency={currency}
          />
        )}
      </div>

      {/* Footer info */}
      <div className="text-center text-xs text-muted-foreground py-4 border-t">
        <p>
          Dernière mise à jour: {data ? format(new Date(), "dd MMMM yyyy à HH:mm", { locale: fr }) : "-"}
        </p>
        <p className="mt-1">
          Les données sont actualisées automatiquement toutes les 15 minutes
        </p>
      </div>
    </div>
  );
}
