"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowUpRight, 
  Users, 
  Receipt, 
  TrendingUp, 
  Clock,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { formatCurrency, formatDate, getDaysOverdue } from "@/components/shared/status-badge";
import Link from "next/link";
import { Debt, Client } from "@/types";
import { CronStatusIndicator } from "@/components/cron/cron-status-indicator";
import { UpcomingRemindersWidget } from "@/components/reminders/upcoming-reminders-widget";

export default function DashboardPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalDebts: 0,
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
    overdueAmount: 0,
    clientCount: 0,
    overdueCount: 0,
    reminderCount: 0,
  });
  const [recentDebts, setRecentDebts] = useState<Debt[]>([]);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [debtsRes, clientsRes, remindersRes] = await Promise.all([
        fetch("/api/debts"),
        fetch("/api/clients"),
        fetch("/api/reminders"),
      ]);

      if (debtsRes.ok && clientsRes.ok) {
        const debts: Debt[] = await debtsRes.json();
        const clients: Client[] = await clientsRes.json();
        const reminders = remindersRes.ok ? await remindersRes.json() : [];

        // Calculer les statistiques
        const totalAmount = debts.reduce((sum, d) => sum + d.amount, 0);
        const paidAmount = debts.reduce((sum, d) => sum + d.paidAmount, 0);
        const pendingAmount = debts
          .filter((d) => d.status === "pending" || d.status === "partial")
          .reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);
        
        const overdueDebts = debts.filter((d) => {
          if (d.status === "paid") return false;
          const daysOverdue = getDaysOverdue(d.dueDate);
          return daysOverdue > 0;
        });
        const overdueAmount = overdueDebts.reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);

        setStats({
          totalDebts: debts.length,
          totalAmount,
          paidAmount,
          pendingAmount,
          overdueAmount,
          clientCount: clients.length,
          overdueCount: overdueDebts.length,
          reminderCount: reminders.length,
        });

        // Trier par date d'échéance et prendre les 5 premières
        const sorted = [...debts]
          .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
          .slice(0, 5);
        setRecentDebts(sorted);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) {
      fetchDashboardData();
    }
  }, [session, fetchDashboardData]);

  const getStatusBadge = (debt: Debt) => {
    const daysOverdue = getDaysOverdue(debt.dueDate);
    
    if (debt.status === "paid") {
      return { label: "Payée", className: "bg-green-100 text-green-700" };
    }
    if (daysOverdue > 0) {
      return { label: `En retard (${daysOverdue}j)`, className: "bg-red-100 text-red-700" };
    }
    return { label: "En attente", className: "bg-yellow-100 text-yellow-700" };
  };

  const statsCards = [
    {
      title: "Créances totales",
      value: formatCurrency(stats.totalAmount),
      subtitle: `${stats.totalDebts} créance${stats.totalDebts > 1 ? "s" : ""}`,
      icon: Receipt,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      title: "Clients",
      value: stats.clientCount.toString(),
      subtitle: "enregistré" + (stats.clientCount > 1 ? "s" : ""),
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Montant récupéré",
      value: formatCurrency(stats.paidAmount),
      subtitle: stats.totalAmount > 0 ? `${Math.round((stats.paidAmount / stats.totalAmount) * 100)}% récupéré` : "0%",
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "En retard",
      value: stats.overdueCount.toString(),
      subtitle: formatCurrency(stats.overdueAmount),
      icon: Clock,
      color: "text-red-600",
      bgColor: "bg-red-100",
    },
  ];

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
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchDashboardData}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
          <Link href="/debts">
            <Button className="bg-orange-500 hover:bg-orange-600">
              <Receipt className="mr-2 h-4 w-4" />
              Nouvelle créance
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{stat.title}</p>
                {stat.subtitle && (
                  <p className="text-xs text-gray-400 mt-1">{stat.subtitle}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Debts */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Créances récentes</CardTitle>
              <CardDescription>Les dernières créances ajoutées</CardDescription>
            </div>
            <Link href="/debts">
              <Button variant="ghost" size="sm" className="text-orange-600">
                Voir tout
                <ArrowUpRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : recentDebts.length === 0 ? (
              <div className="text-center py-8">
                <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Aucune créance enregistrée</p>
                <Link href="/debts">
                  <Button className="mt-4 bg-orange-500 hover:bg-orange-600">
                    Ajouter une créance
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentDebts.map((debt) => {
                  const status = getStatusBadge(debt);
                  const client = debt.client as { name: string; company?: string } | undefined;
                  return (
                    <div
                      key={debt.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                          <Users className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {client?.name || "Client inconnu"}
                          </p>
                          <p className="text-sm text-gray-500">
                            {debt.reference || `Créance du ${formatDate(debt.createdAt || new Date())}`}
                            {" • "}Échéance: {formatDate(debt.dueDate)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(debt.amount - debt.paidAmount, debt.currency)}
                        </p>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${status.className}`}>
                          {status.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions & Alerts */}
        <div className="space-y-6">
          {/* Upcoming Reminders Widget */}
          <UpcomingRemindersWidget />

          {/* Cron Status Indicator */}
          <CronStatusIndicator />

          {/* Alert Card */}
          <Card className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950 border-orange-200 dark:border-orange-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                <AlertCircle className="h-5 w-5" />
                Actions requises
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.overdueCount > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span>{stats.overdueCount} créance{stats.overdueCount > 1 ? "s" : ""} en retard</span>
                </div>
              )}
              {stats.reminderCount > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <span>{stats.reminderCount} relance{stats.reminderCount > 1 ? "s" : ""} envoyée{stats.reminderCount > 1 ? "s" : ""}</span>
                </div>
              )}
              {stats.clientCount === 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>Aucun client enregistré</span>
                </div>
              )}
              {stats.overdueCount === 0 && stats.reminderCount === 0 && stats.clientCount > 0 && (
                <p className="text-sm text-green-600 dark:text-green-400">
                  ✓ Tout est à jour !
                </p>
              )}
              <Link href="/debts">
                <Button className="w-full mt-2 bg-orange-500 hover:bg-orange-600">
                  Gérer les créances
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Subscription Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Abonnement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <Badge
                  variant="outline"
                  className={`text-base px-4 py-1 ${
                    session?.user?.subscriptionStatus === "active"
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-gray-50 text-gray-600 border-gray-200"
                  }`}
                >
                  {session?.user?.subscriptionStatus === "active" ? "Premium" : "Gratuit"}
                </Badge>
                <p className="text-sm text-gray-500 my-4">
                  {session?.user?.subscriptionStatus === "active"
                    ? "Toutes les fonctionnalités débloquées"
                    : "15 relances/mois • 10 clients max"}
                </p>
                <Link href="/subscription">
                  <Button
                    className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                    variant={session?.user?.subscriptionStatus === "active" ? "outline" : "default"}
                  >
                    {session?.user?.subscriptionStatus === "active"
                      ? "Gérer l'abonnement"
                      : "Passer Premium"}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
