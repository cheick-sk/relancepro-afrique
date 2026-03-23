"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/shared/data-table";
import { getRemindersColumns } from "@/components/reminders/reminders-columns";
import { Reminder } from "@/types";
import {
  Bell,
  RefreshCw,
  Mail,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

export default function RemindersPage() {
  const { data: session } = useSession();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchReminders = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.append("type", typeFilter);
      if (statusFilter !== "all") params.append("status", statusFilter);

      const response = await fetch(`/api/reminders?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setReminders(data);
      }
    } catch (error) {
      console.error("Error fetching reminders:", error);
      toast.error("Erreur lors du chargement des relances");
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter]);

  useEffect(() => {
    if (session) {
      fetchReminders();
    }
  }, [session, fetchReminders]);

  // Stats calculation
  const stats = {
    total: reminders.length,
    emails: reminders.filter((r) => r.type === "email").length,
    whatsapp: reminders.filter((r) => r.type === "whatsapp").length,
    sent: reminders.filter((r) => r.status === "sent" || r.status === "delivered").length,
    failed: reminders.filter((r) => r.status === "failed").length,
  };

  const columns = getRemindersColumns();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Bell className="h-6 w-6 text-orange-500" />
            Historique des relances
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Suivez toutes vos relances envoyées
          </p>
        </div>
        <Button variant="outline" onClick={fetchReminders}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-gray-500" />
              <span className="text-sm text-gray-500">Total</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
              {stats.total}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-gray-500">Emails</span>
            </div>
            <p className="text-2xl font-bold text-blue-600 mt-2">{stats.emails}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-green-500" />
              <span className="text-sm text-gray-500">WhatsApp</span>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-2">{stats.whatsapp}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm text-gray-500">Envoyées</span>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-2">{stats.sent}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <span className="text-sm text-gray-500">Échouées</span>
            </div>
            <p className="text-2xl font-bold text-red-600 mt-2">{stats.failed}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="sent">Envoyées</SelectItem>
            <SelectItem value="delivered">Délivrées</SelectItem>
            <SelectItem value="opened">Ouvertes</SelectItem>
            <SelectItem value="failed">Échouées</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des relances</CardTitle>
          <CardDescription>
            {reminders.length} relance{reminders.length > 1 ? "s" : ""} envoyée
            {reminders.length > 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : reminders.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Aucune relance envoyée
              </h3>
              <p className="text-gray-500 mb-4">
                Les relances que vous envoyez apparaîtront ici
              </p>
              <p className="text-sm text-gray-400">
                Allez dans la section Créances pour envoyer des relances
              </p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={reminders}
              searchKey="message"
              searchPlaceholder="Rechercher dans les messages..."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
