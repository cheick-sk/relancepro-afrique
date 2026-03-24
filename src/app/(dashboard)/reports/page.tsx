"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
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
import { CalendarIcon, Download, FileText, Printer, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useLanguage } from "@/lib/i18n/context";
import { toast } from "sonner";

import {
  KPICards,
  CollectionRateChart,
  DebtAgingChart,
  RiskDistributionChart,
  MonthlyTrendsChart,
  ReminderEffectivenessChart,
  TopDebtorsChart,
} from "@/components/analytics";

// Types for chart data
interface DashboardStats {
  totalDebts: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  clientCount: number;
  reminderCount: number;
  recoveryRate: number;
  avgPaymentProbability: number;
}

interface CollectionRateData {
  date: string;
  rate: number;
  recovered: number;
  total: number;
}

interface DebtAgingData {
  bucket: string;
  amount: number;
  count: number;
  percentage: number;
}

interface RiskDistributionData {
  level: string;
  count: number;
  amount: number;
  percentage: number;
}

interface ReminderEffectivenessData {
  type: string;
  sent: number;
  delivered: number;
  opened: number;
  responded: number;
  successRate: number;
}

interface MonthlyTrendData {
  month: string;
  totalDebts: number;
  paidDebts: number;
  newDebts: number;
  recovered: number;
  reminders: number;
}

interface TopDebtorData {
  id: string;
  name: string;
  company: string | null;
  totalDebt: number;
  paidAmount: number;
  debtCount: number;
  riskLevel: string | null;
}

interface ChartData {
  collectionRate: CollectionRateData[];
  debtAging: DebtAgingData[];
  riskDistribution: RiskDistributionData[];
  reminderEffectiveness: ReminderEffectivenessData[];
  monthlyTrends: MonthlyTrendData[];
  topDebtors: TopDebtorData[];
}

export default function ReportsPage() {
  const { data: session } = useSession();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [period, setPeriod] = useState("12");
  const [currency, setCurrency] = useState("GNF");
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({ from: undefined, to: undefined });
  const [exporting, setExporting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!session?.user?.id) return;
    
    try {
      setLoading(true);
      
      const [statsRes, chartsRes] = await Promise.all([
        fetch("/api/analytics/overview"),
        fetch(`/api/analytics/charts?period=${period}`),
      ]);

      if (statsRes.ok) {
        setStats(await statsRes.json());
      }

      if (chartsRes.ok) {
        setChartData(await chartsRes.json());
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  }, [session, period]);

  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session, fetchData]);

  const handleExport = async (format: "pdf" | "csv") => {
    try {
      setExporting(true);
      
      const response = await fetch("/api/analytics/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, period }),
      });

      if (!response.ok) throw new Error("Export failed");

      if (format === "csv") {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `rapport_analytics_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `rapport_analytics_${Date.now()}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }

      toast.success("Rapport exporté avec succès");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Erreur lors de l'export");
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 p-4 md:p-6 print:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            {t("report.title")}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Tableau de bord analytique avancé
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
          >
            <Printer className="mr-2 h-4 w-4" />
            Imprimer
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("csv")}
            disabled={exporting}
          >
            <FileText className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button
            size="sm"
            className="bg-orange-500 hover:bg-orange-600"
            onClick={() => handleExport("pdf")}
            disabled={exporting}
          >
            <Download className="mr-2 h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 print:hidden">
        {/* Period Selector */}
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Période" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">3 derniers mois</SelectItem>
            <SelectItem value="6">6 derniers mois</SelectItem>
            <SelectItem value="12">12 derniers mois</SelectItem>
            <SelectItem value="24">24 derniers mois</SelectItem>
          </SelectContent>
        </Select>

        {/* Currency Selector */}
        <Select value={currency} onValueChange={setCurrency}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Devise" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GNF">GNF</SelectItem>
            <SelectItem value="XOF">XOF</SelectItem>
            <SelectItem value="XAF">XAF</SelectItem>
            <SelectItem value="EUR">EUR</SelectItem>
            <SelectItem value="USD">USD</SelectItem>
          </SelectContent>
        </Select>

        {/* Date Range Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="w-[240px] justify-start">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "d MMM", { locale: fr })} -{" "}
                    {format(dateRange.to, "d MMM yyyy", { locale: fr })}
                  </>
                ) : (
                  format(dateRange.from, "d MMM yyyy", { locale: fr })
                )
              ) : (
                "Sélectionner une période"
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
              locale={fr}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* KPI Cards */}
      <section className="print:break-inside-avoid">
        <KPICards
          stats={stats || {
            totalDebts: 0,
            totalAmount: 0,
            paidAmount: 0,
            pendingAmount: 0,
            overdueAmount: 0,
            clientCount: 0,
            reminderCount: 0,
            recoveryRate: 0,
            avgPaymentProbability: 0,
          }}
          loading={loading}
          currency={currency}
        />
      </section>

      {/* Main Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Collection Rate Chart */}
        <section className="print:break-inside-avoid">
          <CollectionRateChart
            data={chartData?.collectionRate || []}
            loading={loading}
          />
        </section>

        {/* Debt Aging Chart */}
        <section className="print:break-inside-avoid">
          <DebtAgingChart
            data={chartData?.debtAging || []}
            loading={loading}
          />
        </section>

        {/* Risk Distribution Chart */}
        <section className="print:break-inside-avoid">
          <RiskDistributionChart
            data={chartData?.riskDistribution || []}
            loading={loading}
          />
        </section>

        {/* Reminder Effectiveness Chart */}
        <section className="print:break-inside-avoid">
          <ReminderEffectivenessChart
            data={chartData?.reminderEffectiveness || []}
            loading={loading}
          />
        </section>

        {/* Top Debtors Chart */}
        <section className="print:break-inside-avoid lg:col-span-2">
          <TopDebtorsChart
            data={chartData?.topDebtors || []}
            loading={loading}
          />
        </section>
      </div>

      {/* Monthly Trends - Full Width */}
      <section className="print:break-inside-avoid">
        <MonthlyTrendsChart
          data={chartData?.monthlyTrends || []}
          loading={loading}
        />
      </section>

      {/* Footer */}
      <div className="text-center text-sm text-gray-500 dark:text-gray-400 pt-6 border-t border-gray-200 dark:border-gray-800 print:hidden">
        <p>
          Rapport généré le {format(new Date(), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
        </p>
        <p className="mt-1">
          RelancePro Africa - Gestion intelligente des créances
        </p>
      </div>
    </div>
  );
}
