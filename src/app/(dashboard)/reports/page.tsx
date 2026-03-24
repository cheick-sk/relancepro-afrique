"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Receipt,
  Clock,
  Download,
  FileText,
  PieChart,
  Calendar,
  BarChart2,
  LineChart,
  DollarSign,
} from "lucide-react";
import { Debt, Client } from "@/types";
import { useLanguage } from "@/lib/i18n/context";
import { formatCurrencyAmount } from "@/lib/config";
import { toast } from "sonner";

interface DashboardStats {
  totalDebts: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  clientCount: number;
  reminderCount: number;
  recoveryRate: number;
}

export default function ReportsPage() {
  const { data: session } = useSession();
  const { t, locale } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [period, setPeriod] = useState("month");
  const [currencyFilter, setCurrencyFilter] = useState("all");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [debtsRes, clientsRes] = await Promise.all([
        fetch("/api/debts"),
        fetch("/api/clients"),
      ]);

      if (debtsRes.ok && clientsRes.ok) {
        setDebts(await debtsRes.json());
        setClients(await clientsRes.json());
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) fetchData();
  }, [session, fetchData]);

  const stats: DashboardStats = {
    totalDebts: debts.length,
    totalAmount: debts.reduce((sum, d) => sum + d.amount, 0),
    paidAmount: debts.reduce((sum, d) => sum + d.paidAmount, 0),
    pendingAmount: debts
      .filter((d) => d.status !== "paid")
      .reduce((sum, d) => sum + (d.amount - d.paidAmount), 0),
    overdueAmount: debts
      .filter((d) => {
        if (d.status === "paid") return false;
        return new Date(d.dueDate) < new Date();
      })
      .reduce((sum, d) => sum + (d.amount - d.paidAmount), 0),
    clientCount: clients.length,
    reminderCount: debts.reduce((sum, d) => sum + d.reminderCount, 0),
    recoveryRate:
      debts.length > 0
        ? Math.round(
            (debts.reduce((sum, d) => sum + d.paidAmount, 0) /
              debts.reduce((sum, d) => sum + d.amount, 0)) *
              100
          ) || 0
        : 0,
  };

  const exportData = async (format: "pdf" | "excel" | "csv") => {
    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, type: "debts" }),
      });

      if (!response.ok) throw new Error("Export failed");

      if (format === "csv") {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `rapport_creances_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const data = await response.json();
        console.log("Export data:", data);
        toast.success("Données exportées!");
      }
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Erreur lors de l'export");
    }
  };

  const statusData = [
    {
      name: "Payées",
      value: debts.filter((d) => d.status === "paid").length,
      color: "#22c55e",
    },
    {
      name: "En attente",
      value: debts.filter((d) => d.status === "pending").length,
      color: "#eab308",
    },
    {
      name: "En retard",
      value: debts.filter(
        (d) => new Date(d.dueDate) < new Date() && d.status !== "paid"
      ).length,
      color: "#ef4444",
    },
    {
      name: "Partielles",
      value: debts.filter((d) => d.status === "partial").length,
      color: "#3b82f6",
    },
  ].filter((d) => d.value > 0);

  const topClients = Object.entries(
    debts.reduce((acc, d) => {
      const client = d.client as { name: string } | undefined;
      const name = client?.name || "Inconnu";
      acc[name] = (acc[name] || 0) + d.amount;
      return acc;
    }, {} as Record<string, number>)
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, amount]) => ({ name, amount }));

  const currencyData = Object.entries(
    debts.reduce((acc, d) => {
      acc[d.currency] = (acc[d.currency] || 0) + d.amount;
      return acc;
    }, {} as Record<string, number>)
  ).map(([currency, amount]) => ({ currency, amount }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-orange-500" />
            {t("report.title")}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {t("report.description")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportData("csv")}>
            <FileText className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button variant="outline" onClick={() => exportData("excel")}>
            <Download className="mr-2 h-4 w-4" />
            Excel
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Receipt className="h-8 w-8 text-orange-500" />
              <Badge variant="secondary">{stats.totalDebts}</Badge>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
              {formatCurrencyAmount(stats.totalAmount, "GNF", locale)}
            </p>
            <p className="text-sm text-gray-500">{t("report.totalDebts")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <Badge className="bg-green-100 text-green-700">{stats.recoveryRate}%</Badge>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-2">
              {formatCurrencyAmount(stats.paidAmount, "GNF", locale)}
            </p>
            <p className="text-sm text-gray-500">{t("report.totalPaid")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
            <p className="text-2xl font-bold text-yellow-600 mt-2">
              {formatCurrencyAmount(stats.pendingAmount, "GNF", locale)}
            </p>
            <p className="text-sm text-gray-500">{t("report.totalPending")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <TrendingDown className="h-8 w-8 text-red-500" />
            </div>
            <p className="text-2xl font-bold text-red-600 mt-2">
              {formatCurrencyAmount(stats.overdueAmount, "GNF", locale)}
            </p>
            <p className="text-sm text-gray-500">{t("report.totalOverdue")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Répartition par statut</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {statusData.map((item) => (
                <div key={item.name} className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="flex-1">{item.name}</span>
                  <span className="font-semibold">{item.value}</span>
                  <span className="text-sm text-gray-500">
                    {Math.round((item.value / debts.length) * 100) || 0}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Clients */}
        <Card>
          <CardHeader>
            <CardTitle>Top 5 clients</CardTitle>
            <CardDescription>Clients avec le plus de créances</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topClients.map((client, index) => (
                <div key={client.name} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-semibold text-sm">
                    {index + 1}
                  </div>
                  <span className="flex-1 truncate">{client.name}</span>
                  <span className="font-semibold text-orange-600">
                    {formatCurrencyAmount(client.amount, "GNF", locale)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Currency Breakdown */}
      {currencyData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Par devise</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {currencyData.map((item) => (
                <div key={item.currency} className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <p className="text-sm text-gray-500">{item.currency}</p>
                  <p className="text-lg font-bold">{item.amount.toLocaleString("fr-FR")}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
