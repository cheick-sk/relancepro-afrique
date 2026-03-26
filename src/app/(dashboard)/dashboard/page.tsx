"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowUpRight, 
  RefreshCw,
  Download,
  AlertTriangle,
  Clock,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { StatsCards, getDefaultStatsCards, type StatCardData } from "@/components/dashboard/stats-cards";
import { KPIGrid, getDefaultKPIs, type KPIData } from "@/components/dashboard/kpi-grid";
import { RecoveryChart, type RecoveryData } from "@/components/dashboard/charts/recovery-chart";
import { DebtStatusChart, type DebtStatusData } from "@/components/dashboard/charts/debt-status-chart";
import { RemindersChart, type ReminderData } from "@/components/dashboard/charts/reminders-chart";
import { ClientsChart, type ClientDebtData } from "@/components/dashboard/charts/clients-chart";
import { PaymentPredictionChart, type PaymentPredictionData } from "@/components/dashboard/charts/payment-prediction-chart";
import { DateRange } from "react-day-picker";
import { subDays } from "date-fns";
import { formatCurrency, formatDate } from "@/components/shared/status-badge";

interface AnalyticsData {
  summary: {
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
    reminderCount: number;
    previousTotalAmount: number;
    previousPaidAmount: number;
    previousPendingAmount: number;
    previousReminderCount: number;
    sparklineData: {
      amounts: number[];
      recovered: number[];
      pending: number[];
      reminders: number[];
    };
  };
  charts: {
    recovery: RecoveryData[];
    debtStatus: DebtStatusData[];
    reminders: ReminderData[];
    topDebtors: ClientDebtData[];
    paymentPredictions: PaymentPredictionData[];
  };
  kpis: {
    recoveryRate: number;
    previousRecoveryRate: number;
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
      reference: string | null;
    }>;
    overdueCount: number;
    overdueAmount: number;
  };
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [data, setData] = useState<AnalyticsData | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (date?.from) params.append("from", date.from.toISOString());
      if (date?.to) params.append("to", date.to.toISOString());

      const response = await fetch(`/api/analytics?${params.toString()}`);
      if (response.ok) {
        const analyticsData = await response.json();
        setData(analyticsData);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    if (session) {
      fetchAnalytics();
    }
  }, [session, fetchAnalytics]);

  const handleExport = async () => {
    try {
      // Export analytics to Excel
      const response = await fetch("/api/export/excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "analytics",
          dateRange: date,
        }),
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `relancepro-analytics-${new Date().toISOString().split("T")[0]}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Export error:", error);
    }
  };

  // Prepare stats cards
  const statsCards: StatCardData[] = data 
    ? getDefaultStatsCards({
        totalAmount: data.summary.totalAmount,
        paidAmount: data.summary.paidAmount,
        pendingAmount: data.summary.pendingAmount,
        reminderCount: data.summary.reminderCount,
        previousTotalAmount: data.summary.previousTotalAmount,
        previousPaidAmount: data.summary.previousPaidAmount,
        previousPendingAmount: data.summary.previousPendingAmount,
        previousReminderCount: data.summary.previousReminderCount,
        sparklineData: data.summary.sparklineData,
      })
    : [];

  // Prepare KPIs
  const kpis: KPIData[] = data
    ? getDefaultKPIs({
        recoveryRate: data.kpis.recoveryRate,
        avgPaymentDelay: data.kpis.avgPaymentDelay,
        responseRate: data.kpis.responseRate,
        avgDebtAmount: data.kpis.avgDebtAmount,
        activeClients: data.kpis.activeClients,
        roiPercentage: data.kpis.roiPercentage,
        previousRecoveryRate: data.kpis.previousRecoveryRate,
        previousActiveClients: data.kpis.totalClients,
      })
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Bonjour, {session?.user?.name || "Utilisateur"} 👋
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Voici l&apos;aperçu de vos créances
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker date={date} onDateChange={setDate} />
          <Button variant="outline" onClick={fetchAnalytics}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Exporter
          </Button>
          <Link href="/debts">
            <Button className="bg-orange-500 hover:bg-orange-600">
              <ArrowUpRight className="mr-2 h-4 w-4" />
              Nouvelle créance
            </Button>
          </Link>
        </div>
      </div>

      {/* Loading State */}
      {loading && !data ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <StatsCards stats={statsCards} />

          {/* Critical Alerts */}
          {data?.alerts.criticalDebts && data.alerts.criticalDebts.length > 0 && (
            <Card className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/50 dark:to-orange-950/50 border-red-200 dark:border-red-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
                  <AlertTriangle className="h-5 w-5" />
                  Alertes critiques
                </CardTitle>
                <CardDescription className="text-red-600 dark:text-red-400">
                  {data.alerts.overdueCount} créance{data.alerts.overdueCount > 1 ? "s" : ""} en retard •{" "}
                  {formatCurrency(data.alerts.overdueAmount)} GNF
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {data.alerts.criticalDebts.map((debt) => (
                    <div
                      key={debt.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-white/80 dark:bg-gray-800/80 border border-red-100 dark:border-red-900"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                          <Clock className="h-5 w-5 text-red-600 dark:text-red-300" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {debt.clientName}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {debt.reference || "Sans référence"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-red-600 dark:text-red-300">
                          {debt.daysOverdue}j
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {formatCurrency(debt.amount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <Link href="/debts?filter=overdue">
                  <Button variant="outline" className="mt-4 w-full border-red-200 text-red-700 hover:bg-red-50">
                    Voir toutes les créances en retard
                    <ArrowUpRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Main Charts */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="bg-gray-100 dark:bg-gray-800">
              <TabsTrigger value="overview">Vue d&apos;ensemble</TabsTrigger>
              <TabsTrigger value="recovery">Recouvrement</TabsTrigger>
              <TabsTrigger value="predictions">Prédictions IA</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {/* Charts Row 1 */}
              <div className="grid gap-6 lg:grid-cols-2">
                <RecoveryChart data={data?.charts.recovery || []} />
                <DebtStatusChart data={data?.charts.debtStatus || []} />
              </div>

              {/* Charts Row 2 */}
              <div className="grid gap-6 lg:grid-cols-2">
                <RemindersChart data={data?.charts.reminders || []} />
                <ClientsChart data={data?.charts.topDebtors || []} />
              </div>

              {/* KPIs Grid */}
              <KPIGrid kpis={kpis} />
            </TabsContent>

            <TabsContent value="recovery" className="space-y-4">
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <RecoveryChart 
                    data={data?.charts.recovery || []}
                    title="Évolution du recouvrement"
                    description="Montants récupérés et tendance mensuelle"
                  />
                </div>
                <DebtStatusChart 
                  data={data?.charts.debtStatus || []}
                  title="Répartition des créances"
                  description="Distribution par statut"
                />
              </div>

              {/* Recovery Stats */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      <span className="text-sm text-gray-500">Taux global</span>
                    </div>
                    <p className="text-3xl font-bold mt-2">{data?.kpis.recoveryRate || 0}%</p>
                    {data?.kpis.previousRecoveryRate !== undefined && (
                      <p className="text-sm text-green-600 mt-1">
                        {data.kpis.recoveryRate > data.kpis.previousRecoveryRate ? "+" : ""}
                        {data.kpis.recoveryRate - data.kpis.previousRecoveryRate}pts vs période préc.
                      </p>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-orange-600" />
                      <span className="text-sm text-gray-500">Délai moyen</span>
                    </div>
                    <p className="text-3xl font-bold mt-2">{data?.kpis.avgPaymentDelay || 0} jours</p>
                    <p className="text-sm text-gray-500 mt-1">pour le paiement</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-green-100 text-green-700">✉</Badge>
                      <span className="text-sm text-gray-500">Taux de réponse</span>
                    </div>
                    <p className="text-3xl font-bold mt-2">{data?.kpis.responseRate || 0}%</p>
                    <p className="text-sm text-gray-500 mt-1">aux relances</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-blue-100 text-blue-700">ROI</Badge>
                      <span className="text-sm text-gray-500">Retour invest.</span>
                    </div>
                    <p className="text-3xl font-bold mt-2 text-green-600">{data?.kpis.roiPercentage || 0}%</p>
                    <p className="text-sm text-gray-500 mt-1">temps gagné vs coût</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="predictions" className="space-y-4">
              <div className="grid gap-6 lg:grid-cols-2">
                <PaymentPredictionChart data={data?.charts.paymentPredictions || []} />
                <ClientsChart 
                  data={data?.charts.topDebtors || []}
                  title="Clients à risque"
                  description="Clients avec le plus de créances impayées"
                />
              </div>

              {/* AI Info Card */}
              <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/50 dark:to-indigo-950/50 border-purple-200 dark:border-purple-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                    <span className="text-xl">✨</span>
                    À propos des prédictions IA
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-purple-600 dark:text-purple-400 space-y-2">
                  <p>
                    Nos prédictions sont basées sur plusieurs facteurs : l&apos;historique de paiement du client, 
                    le nombre de relances envoyées, l&apos;ancienneté de la créance et d&apos;autres indicateurs comportementaux.
                  </p>
                  <p>
                    <strong>Comment améliorer vos prédictions :</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Mettez à jour régulièrement les informations clients</li>
                    <li>Enregistrez les dates de paiement exactes</li>
                    <li>Utilisez des relances personnalisées</li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Quick Stats Footer */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Créances totales</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{data?.kpis.totalDebts || 0}</p>
                <p className="text-sm text-gray-500">
                  {formatCurrency(data?.summary.totalAmount || 0)} GNF au total
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Clients</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{data?.kpis.totalClients || 0}</p>
                <p className="text-sm text-gray-500">
                  {data?.kpis.activeClients || 0} avec créances actives
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Relances ce mois</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{data?.summary.reminderCount || 0}</p>
                <p className="text-sm text-gray-500">
                  {data?.kpis.responseRate || 0}% ont reçu une réponse
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
