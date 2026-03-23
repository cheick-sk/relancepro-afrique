"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/shared/data-table";
import { DebtFormDialog } from "@/components/debts/debt-form-dialog";
import { getDebtColumns } from "@/components/debts/debt-columns";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import { SendReminderDialog } from "@/components/reminders/send-reminder-dialog";
import { Debt, Client } from "@/types";
import { Receipt, Plus, RefreshCw, AlertTriangle, Clock, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/components/shared/status-badge";

export default function DebtsPage() {
  const { data: session } = useSession();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [debtToDelete, setDebtToDelete] = useState<Debt | null>(null);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [debtForReminder, setDebtForReminder] = useState<Debt | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [debtsRes, clientsRes] = await Promise.all([
        fetch(`/api/debts?status=${statusFilter}`),
        fetch("/api/clients"),
      ]);

      if (debtsRes.ok && clientsRes.ok) {
        const debtsData = await debtsRes.json();
        const clientsData = await clientsRes.json();
        setDebts(debtsData);
        setClients(clientsData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session, fetchData]);

  // Stats calculation
  const stats = {
    total: debts.length,
    pending: debts.filter((d) => d.status === "pending").length,
    overdue: debts.filter((d) => {
      const daysOverdue = Math.ceil(
        (new Date().getTime() - new Date(d.dueDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysOverdue > 0 && d.status !== "paid";
    }).length,
    totalAmount: debts.reduce((sum, d) => sum + d.amount, 0),
    paidAmount: debts.reduce((sum, d) => sum + d.paidAmount, 0),
  };

  const handleCreate = () => {
    if (clients.length === 0) {
      toast.error("Créez d'abord un client");
      setClientDialogOpen(true);
      return;
    }
    setSelectedDebt(null);
    setDialogOpen(true);
  };

  const handleEdit = (debt: Debt) => {
    setSelectedDebt(debt);
    setDialogOpen(true);
  };

  const handleDelete = (debt: Debt) => {
    setDebtToDelete(debt);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!debtToDelete) return;

    try {
      const response = await fetch(`/api/debts/${debtToDelete.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Créance supprimée avec succès");
        fetchData();
      } else {
        toast.error("Erreur lors de la suppression");
      }
    } catch (error) {
      console.error("Error deleting debt:", error);
      toast.error("Erreur lors de la suppression");
    } finally {
      setDeleteDialogOpen(false);
      setDebtToDelete(null);
    }
  };

  const handleSendReminder = (debt: Debt, type: "email" | "whatsapp") => {
    setDebtForReminder(debt);
    setReminderDialogOpen(true);
  };

  const columns = getDebtColumns({
    onEdit: handleEdit,
    onDelete: handleDelete,
    onSendReminder: handleSendReminder,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Receipt className="h-6 w-6 text-orange-500" />
            Créances
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Gérez vos créances et relances clients
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
          <Button className="bg-orange-500 hover:bg-orange-600" onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle créance
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-gray-500" />
              <span className="text-sm text-gray-500">Total créances</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
              {formatCurrency(stats.totalAmount)}
            </p>
            <p className="text-sm text-gray-500">{stats.total} créance{stats.total > 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <span className="text-sm text-gray-500">En attente</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600 mt-2">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span className="text-sm text-gray-500">En retard</span>
            </div>
            <p className="text-2xl font-bold text-red-600 mt-2">{stats.overdue}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span className="text-sm text-gray-500">Récupéré</span>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-2">
              {formatCurrency(stats.paidAmount)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="partial">Partielle</SelectItem>
            <SelectItem value="paid">Payée</SelectItem>
            <SelectItem value="disputed">Contestée</SelectItem>
            <SelectItem value="cancelled">Annulée</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des créances</CardTitle>
          <CardDescription>
            {debts.length} créance{debts.length > 1 ? "s" : ""} enregistrée
            {debts.length > 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={debts}
              searchKey="reference"
              searchPlaceholder="Rechercher par référence..."
            />
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <DebtFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        debt={selectedDebt}
        clients={clients}
        onSuccess={fetchData}
      />

      {/* Client Dialog (if no clients) */}
      <ClientFormDialog
        open={clientDialogOpen}
        onOpenChange={setClientDialogOpen}
        onSuccess={() => {
          fetchData();
          setClientDialogOpen(false);
        }}
      />

      {/* Send Reminder Dialog */}
      <SendReminderDialog
        open={reminderDialogOpen}
        onOpenChange={setReminderDialogOpen}
        debt={debtForReminder}
        onSuccess={fetchData}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la créance ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette créance de{" "}
              <strong>{formatCurrency(debtToDelete?.amount || 0, debtToDelete?.currency)}</strong>{" "}
              ({debtToDelete?.client?.name}) ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
