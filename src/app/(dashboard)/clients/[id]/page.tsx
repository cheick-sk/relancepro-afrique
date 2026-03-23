"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SharePortal } from "./share-portal";
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  MapPin,
  FileText,
  Calendar,
  RefreshCw,
  Edit,
  User,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

interface ClientDetail {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  address: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
  debts: Array<{
    id: string;
    reference: string | null;
    description: string | null;
    amount: number;
    paidAmount: number;
    currency: string;
    dueDate: string;
    status: string;
  }>;
  _count?: {
    debts: number;
    reminders: number;
  };
}

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const clientId = params?.id as string;

  const fetchClient = useCallback(async () => {
    if (!clientId || !session) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/clients/${clientId}`);
      if (!response.ok) {
        throw new Error("Client not found");
      }
      const data = await response.json();
      setClient(data);
    } catch (error) {
      console.error("Error fetching client:", error);
      toast.error("Erreur lors du chargement du client");
    } finally {
      setLoading(false);
    }
  }, [clientId, session]);

  useEffect(() => {
    fetchClient();
  }, [fetchClient]);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: "bg-green-100 text-green-800",
      inactive: "bg-gray-100 text-gray-800",
      blacklisted: "bg-red-100 text-red-800",
    };
    const labels: Record<string, string> = {
      active: "Actif",
      inactive: "Inactif",
      blacklisted: "Liste noire",
    };
    return (
      <Badge className={styles[status] || styles.inactive}>
        {labels[status] || status}
      </Badge>
    );
  };

  const getDebtStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      partial: "bg-blue-100 text-blue-800",
      paid: "bg-green-100 text-green-800",
      disputed: "bg-red-100 text-red-800",
      cancelled: "bg-gray-100 text-gray-800",
    };
    const labels: Record<string, string> = {
      pending: "En attente",
      partial: "Partiel",
      paid: "Payé",
      disputed: "Contesté",
      cancelled: "Annulé",
    };
    return (
      <Badge className={styles[status] || styles.pending}>
        {labels[status] || status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Client non trouvé</h2>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/clients")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour aux clients
        </Button>
      </div>
    );
  }

  const totalDebt = client.debts
    .filter((d) => d.status !== "paid" && d.status !== "cancelled")
    .reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/clients")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <User className="w-6 h-6 text-orange-500" />
              {client.name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              {getStatusBadge(client.status)}
              {client.company && (
                <span className="text-gray-500">{client.company}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchClient}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
          <SharePortal client={client} />
          <Button className="bg-orange-500 hover:bg-orange-600">
            <Edit className="w-4 h-4 mr-2" />
            Modifier
          </Button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Créances</p>
                <p className="text-2xl font-bold text-gray-900">
                  {client.debts.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Montant dû</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(totalDebt, client.debts[0]?.currency || "GNF")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Client depuis</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatDate(client.createdAt)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Informations</TabsTrigger>
          <TabsTrigger value="debts">Créances ({client.debts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Coordonnées</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {client.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <a
                      href={`mailto:${client.email}`}
                      className="text-blue-600 hover:underline"
                    >
                      {client.email}
                    </a>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <a
                      href={`tel:${client.phone}`}
                      className="text-blue-600 hover:underline"
                    >
                      {client.phone}
                    </a>
                  </div>
                )}
                {client.company && (
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-gray-400" />
                    <span>{client.company}</span>
                  </div>
                )}
                {client.address && (
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    <span>{client.address}</span>
                  </div>
                )}
              </div>
              {client.notes && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium text-gray-500 mb-1">Notes</p>
                  <p className="text-gray-700">{client.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="debts">
          <Card>
            <CardHeader>
              <CardTitle>Créances</CardTitle>
              <CardDescription>
                Toutes les créances de ce client
              </CardDescription>
            </CardHeader>
            <CardContent>
              {client.debts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Aucune créance enregistrée</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {client.debts.map((debt) => (
                    <div
                      key={debt.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {debt.reference || `Facture #${debt.id.slice(-6)}`}
                          </span>
                          {getDebtStatusBadge(debt.status)}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          Échéance: {formatDate(debt.dueDate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">
                          {formatCurrency(debt.amount - debt.paidAmount, debt.currency)}
                        </p>
                        {debt.paidAmount > 0 && (
                          <p className="text-sm text-green-600">
                            Payé: {formatCurrency(debt.paidAmount, debt.currency)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
