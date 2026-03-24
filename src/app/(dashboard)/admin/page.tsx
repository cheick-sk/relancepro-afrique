"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  DollarSign,
  CreditCard,
  TrendingUp,
  Activity,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { formatCurrencyAmount } from "@/lib/config";

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalDebts: number;
  totalAmount: number;
  totalPaid: number;
  totalReminders: number;
}

interface Profile {
  id: string;
  email: string;
  name: string | null;
  companyName: string | null;
  subscriptionStatus: string;
  subscriptionPlan: string | null;
  createdAt: string;
  _count: {
    clients: number;
    debts: number;
    reminders: number;
    payments: number;
  };
}

export default function AdminDashboard() {
  const { t, locale } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setProfiles(data.profiles);
      }
    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setLoading(false);
    }
  };

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Admin Dashboard
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Vue d&apos;ensemble de la plateforme
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <Users className="h-8 w-8 text-blue-500 mb-2" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats?.totalUsers || 0}
            </p>
            <p className="text-sm text-gray-500">Utilisateurs</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <CreditCard className="h-8 w-8 text-green-500 mb-2" />
            <p className="text-2xl font-bold text-green-600">
              {stats?.activeUsers || 0}
            </p>
            <p className="text-sm text-gray-500">Abonnés actifs</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <DollarSign className="h-8 w-8 text-orange-500 mb-2" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrencyAmount(stats?.totalAmount || 0, "GNF", locale)}
            </p>
            <p className="text-sm text-gray-500">Créances totales</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <TrendingUp className="h-8 w-8 text-green-500 mb-2" />
            <p className="text-2xl font-bold text-green-600">
              {formatCurrencyAmount(stats?.totalPaid || 0, "GNF", locale)}
            </p>
            <p className="text-sm text-gray-500">Montant récupéré</p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Activity className="h-6 w-6 text-blue-500" />
              <div>
                <p className="text-xl font-bold">{stats?.totalDebts || 0}</p>
                <p className="text-sm text-gray-500">Créances</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-6 w-6 text-green-500" />
              <div>
                <p className="text-xl font-bold">{stats?.totalReminders || 0}</p>
                <p className="text-sm text-gray-500">Relances envoyées</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-6 w-6 text-green-500" />
              <div>
                <p className="text-xl font-bold">
                  {stats?.totalAmount
                    ? Math.round(((stats?.totalPaid || 0) / stats.totalAmount) * 100)
                    : 0}%
                </p>
                <p className="text-sm text-gray-500">Taux de recouvrement</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Users */}
      <Card>
        <CardHeader>
          <CardTitle>Utilisateurs récents</CardTitle>
          <CardDescription>Les derniers inscrits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {profiles.slice(0, 10).map((profile) => (
              <div
                key={profile.id}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-semibold">
                    {profile.name?.charAt(0) || profile.email.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {profile.name || profile.email}
                    </p>
                    <p className="text-sm text-gray-500">{profile.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right text-sm">
                    <p>{profile._count.clients} clients</p>
                    <p className="text-gray-400">{profile._count.debts} créances</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      profile.subscriptionStatus === "active"
                        ? "bg-green-50 text-green-700"
                        : "bg-gray-50 text-gray-600"
                    }
                  >
                    {profile.subscriptionStatus === "active"
                      ? profile.subscriptionPlan
                      : "Free"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
