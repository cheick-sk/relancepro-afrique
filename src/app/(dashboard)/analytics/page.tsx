"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  RefreshCw,
  Download,
  Calendar as CalendarIcon,
  FileSpreadsheet,
  FileText,
  Printer,
  ChevronDown,
  DateRange,
  TrendingUp,
  AlertCircle,
  LayoutDashboard,
  PieChart,
  Mail,
  Clock,
} from "lucide-react";
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfYear } from "date-fns";
import { fr } from "date-fns/locale";
import { DateRange as DateRangeType } from "react-day-picker";

import { KPICards } from "@/components/analytics/kpi-cards";
import { CollectionChart } from "@/components/analytics/collection-chart";
import { DebtStatusChart } from "@/components/analytics/debt-status-chart";
import { ClientRiskChart } from "@/components/analytics/client-risk-chart";
import { ReminderEffectiveness } from "@/components/analytics/reminder-effectiveness";
import { PaymentPrediction } from "@/components/analytics/payment-prediction";
import { TopDebtors } from "@/components/analytics/top-debtors";
import { TrendAnalysis } from "@/components/analytics/trend-analysis";

// Types for analytics data
interface AnalyticsData {
  kpis: {
    totalDebts: number;
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
    overdueAmount: number;
    clientCount: number;
    reminderCount: number;
    recoveryRate: number;
    avgPaymentProbability: number;
    avgDaysToPayment: number;
    activeClientsCount: number;
    overdueDebtsCount: number;
  };
  previousKpis?: {
    totalAmount: number;
    paidAmount: number;
    recoveryRate: number;
  };
  collectionData: Array<{
    date: string;
    collected: number;
    previousPeriod?: number;
  }>;
  previousCollectionData: Array<{
    date: string;
    collected: number;
  }>;
  debtStatusData: Array<{
    name: string;
    value: number;
    amount: number;
    color: string;
    percentage: number;
    status?: string;
  }>;
  clientRiskData: Array<{
    level: string;
    count: number;
    amount: number;
    percentage: number;
  }>;
  reminderChannelData: Array<{
    type: string;
    sent: number;
    delivered: number;
    opened: number;
    responded: number;
    successRate: number;
  }>;
  reminderNumberData: Array<{
    reminderNumber: string;
    sent: number;
    successRate: number;
    avgResponseTime: number;
  }>;
  predictionData: Array<{
    date: string;
    expected: number;
    lower: number;
    upper: number;
    confidence: number;
  }>;
  predictionSummary: {
    totalExpected: number;
    confidence: number;
    factors: Array<{
      name: string;
      impact: "positive" | "negative" | "neutral";
      value: number;
    }>;
  };
  topDebtors: Array<{
    id: string;
    name: string;
    company: string | null;
    email?: string | null;
    phone?: string | null;
    totalDebt: number;
    paidAmount: number;
    debtCount: number;
    riskLevel: string | null;
    daysOverdue?: number;
    lastReminder?: string | null;
  }>;
  trendData: {
    monthlyData: Array<{
      period: string;
      current: number;
      previous?: number;
      previousYear?: number;
    }>;
    seasonalPatterns: Array<{
      month: string;
      avgCollection: number;
      index: number;
    }>;
    metrics: {
      momChange: number;
      yoyChange: number;
      avgMonthlyCollection: number;
      bestMonth: string;
      worstMonth: string;
    };
  };
  dateRange: {
    start: string;
    end: string;
  };
  currency: string;
}

const CURRENCIES = [
  { code: "GNF", name: "Franc guinéen", symbol: "GNF" },
  { code: "XOF", name: "Franc CFA (BCEAO)", symbol: "XOF" },
  { code: "XAF", name: "Franc CFA (BEAC)", symbol: "XAF" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "USD", name: "Dollar américain", symbol: "$" },
];

const PRESET_RANGES = [
  { label: "7 derniers jours", value: "7d" },
  { label: "30 derniers jours", value: "30d" },
  { label: "Ce mois", value: "thisMonth" },
  { label: "Mois dernier", value: "lastMonth" },
  { label: "Ce trimestre", value: "thisQuarter" },
  { label: "Cette année", value: "thisYear" },
  { label: "Personnalisé", value: "custom" },
];

export default function AnalyticsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [currency, setCurrency] = useState("GNF");
  const [dateRange, setDateRange] = useState<DateRangeType | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [presetRange, setPresetRange] = useState("30d");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Export
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"pdf" | "excel">("pdf");
  const [exporting, setExporting] = useState(false);

  // Apply preset date range
  const applyPresetRange = useCallback((preset: string) => {
    setPresetRange(preset);
    const now = new Date();

    switch (preset) {
      case "7d":
        setDateRange({ from: subDays(now, 7), to: now });
        break;
      case "30d":
        setDateRange({ from: subDays(now, 30), to: now });
        break;
      case "thisMonth":
        setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
        break;
      case "lastMonth":
        const lastMonth = subMonths(now, 1);
        setDateRange({ from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) });
        break;
      case "thisQuarter":
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        setDateRange({ from: quarterStart, to: now });
        break;
      case "thisYear":
        setDateRange({ from: startOfYear(now), to: now });
        break;
      case "custom":
        setIsCalendarOpen(true);
        break;
    }
  }, []);

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    if (!dateRange?.from || !dateRange?.to) return;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
        currency,
      });

      const response = await fetch(`/api/analytics?${params}`);

      if (!response.ok) {
        throw new Error("Erreur lors du chargement des données");
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error("Error fetching analytics:", err);
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  }, [dateRange, currency]);

  useEffect(() => {
    if (session) {
      fetchAnalytics();
    }
  }, [session, fetchAnalytics]);

  // Handle export
  const handleExport = async () => {
    if (!dateRange?.from || !dateRange?.to) return;

    try {
      setExporting(true);

      const params = new URLSearchParams({
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
        currency,
        format: exportFormat,
      });

      const response = await fetch(`/api/analytics/export?${params}`);

      if (!response.ok) {
        throw new Error("Erreur lors de l'export");
      }

      if (exportFormat === "pdf") {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `relancepro-analytics-${format(new Date(), "yyyy-MM-dd")}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      } else {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `relancepro-analytics-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      }

      setExportDialogOpen(false);
    } catch (err) {
      console.error("Export error:", err);
      setError("Erreur lors de l'export");
    } finally {
      setExporting(false);
    }
  };

  // Handle print
  const handlePrint = () => {
    window.print();
  };

  // Handle client click
  const handleClientClick = (clientId: string) => {
    window.location.href = `/clients?id=${clientId}`;
  };

  // Handle send reminder
  const handleSendReminder = async (clientId: string, type: "email" | "whatsapp") => {
    try {
      window.location.href = `/reminders?clientId=${clientId}&type=${type}`;
    } catch (err) {
      console.error("Error sending reminder:", err);
    }
  };

  // Handle risk level click
  const handleRiskLevelClick = (level: string) => {
    window.location.href = `/clients?riskLevel=${level}`;
  };

  const formatDateRange = () => {
    if (!dateRange?.from) return "Sélectionner une période";
    if (!dateRange.to) return format(dateRange.from, "d MMM yyyy", { locale: fr });
    return `${format(dateRange.from, "d MMM", { locale: fr })} - ${format(dateRange.to, "d MMM yyyy", { locale: fr })}`;
  };

  return (
    <div className="space-y-6 p-6 max-w-[1800px] mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="h-7 w-7 text-orange-500" />
              Tableau de Bord Analytics
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Analyse détaillée de vos performances de recouvrement
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAnalytics}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="print:hidden"
            >
              <Printer className="h-4 w-4 mr-2" />
              Imprimer
            </Button>
            <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-orange-500 hover:bg-orange-600">
                  <Download className="h-4 w-4 mr-2" />
                  Exporter
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Exporter les données</DialogTitle>
                  <DialogDescription>
                    Choisissez le format d&apos;export pour vos données analytiques
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Format</Label>
                    <div className="flex gap-4">
                      <Button
                        variant={exportFormat === "pdf" ? "default" : "outline"}
                        onClick={() => setExportFormat("pdf")}
                        className={exportFormat === "pdf" ? "bg-orange-500 hover:bg-orange-600" : ""}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        PDF
                      </Button>
                      <Button
                        variant={exportFormat === "excel" ? "default" : "outline"}
                        onClick={() => setExportFormat("excel")}
                        className={exportFormat === "excel" ? "bg-orange-500 hover:bg-orange-600" : ""}
                      >
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Excel
                      </Button>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleExport}
                    disabled={exporting}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    {exporting ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Export en cours...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Exporter
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 print:hidden">
          {/* Date Range */}
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-gray-500" />
            <Select value={presetRange} onValueChange={applyPresetRange}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Période" />
              </SelectTrigger>
              <SelectContent>
                {PRESET_RANGES.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Date Range */}
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <DateRange className="h-4 w-4 mr-2" />
                {formatDateRange()}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={(range) => {
                  setDateRange(range);
                  setPresetRange("custom");
                }}
                numberOfMonths={2}
                locale={fr}
              />
            </PopoverContent>
          </Popover>

          {/* Currency Selector */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-gray-500">Devise:</span>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Devise" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((curr) => (
                  <SelectItem key={curr.code} value={curr.code}>
                    {curr.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <div>
            <p className="font-medium text-red-700 dark:text-red-300">Erreur</p>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchAnalytics} className="ml-auto">
            Réessayer
          </Button>
        </div>
      )}

      {/* KPI Cards */}
      {data && (
        <KPICards
          stats={data.kpis}
          previousStats={data.previousKpis}
          loading={loading}
          currency={currency}
        />
      )}

      {/* Main Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Collection Chart */}
        {data && (
          <CollectionChart
            data={data.collectionData}
            previousPeriodData={data.previousCollectionData}
            loading={loading}
            currency={currency}
            groupBy="month"
          />
        )}

        {/* Debt Status Chart */}
        {data && (
          <DebtStatusChart
            data={data.debtStatusData}
            loading={loading}
            currency={currency}
          />
        )}
      </div>

      {/* Second Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Client Risk Chart */}
        {data && (
          <ClientRiskChart
            data={data.clientRiskData}
            loading={loading}
            currency={currency}
            onRiskLevelClick={handleRiskLevelClick}
          />
        )}

        {/* Reminder Effectiveness */}
        {data && (
          <ReminderEffectiveness
            channelData={data.reminderChannelData}
            numberData={data.reminderNumberData}
            loading={loading}
          />
        )}

        {/* Payment Prediction */}
        {data && (
          <PaymentPrediction
            predictions={data.predictionData}
            totalExpected={data.predictionSummary.totalExpected}
            confidence={data.predictionSummary.confidence}
            factors={data.predictionSummary.factors}
            loading={loading}
            currency={currency}
          />
        )}
      </div>

      {/* Third Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Debtors */}
        {data && (
          <TopDebtors
            data={data.topDebtors}
            loading={loading}
            currency={currency}
            onViewClient={handleClientClick}
            onSendReminder={handleSendReminder}
          />
        )}

        {/* Trend Analysis */}
        {data && (
          <TrendAnalysis
            monthlyData={data.trendData.monthlyData}
            seasonalPatterns={data.trendData.seasonalPatterns}
            metrics={data.trendData.metrics}
            loading={loading}
            currency={currency}
          />
        )}
      </div>

      {/* Footer Info */}
      <Card className="bg-gray-50 dark:bg-gray-800/50 print:hidden">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span>
                Dernière mise à jour: {format(new Date(), "d MMMM yyyy à HH:mm", { locale: fr })}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span>Période: {formatDateRange()}</span>
              <Badge variant="outline">
                {CURRENCIES.find((c) => c.code === currency)?.name || currency}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
