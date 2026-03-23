"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DebtsList } from "@/components/portal/debts-list";
import { PaymentHistory } from "@/components/portal/payment-history";
import { ContactSupport } from "@/components/portal/contact-support";
import { DebtSummary } from "@/components/portal/debt-summary";
import { ContactCard } from "@/components/portal/contact-card";
import { 
  RefreshCw, 
  FileText, 
  CreditCard, 
  MessageCircle,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Building2
} from "lucide-react";

interface PortalData {
  client: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    address: string | null;
  };
  creditor: {
    name: string;
    phone: string | null;
    email: string;
  };
  debts: Array<{
    id: string;
    reference: string | null;
    description: string | null;
    amount: number;
    paidAmount: number;
    balance: number;
    currency: string;
    dueDate: string;
    issueDate: string | null;
    status: string;
    isOverdue: boolean;
  }>;
  paymentHistory: Array<{
    id: string;
    amount: number;
    currency: string;
    paidAt: string | null;
    paymentMethod: string | null;
    debtId: string | null;
  }>;
  summary: {
    totalDebts: number;
    totalAmount: number;
    totalPaid: number;
    totalOwed: number;
    overdueCount: number;
    overdueAmount: number;
  };
  token: {
    expiresAt: string;
    accessedCount: number;
  };
}

export default function PortalPage({ params }: { params: Promise<{ token: string }> }) {
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string>("");
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);

  // Get token from params
  useEffect(() => {
    params.then((p) => setToken(p.token));
  }, [params]);

  // Check for payment callback status
  useEffect(() => {
    const status = searchParams.get("payment_status");
    const message = searchParams.get("message");
    if (status) {
      setPaymentStatus(status);
      setPaymentMessage(message);
      // Clear URL params after showing message
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete("payment_status");
        url.searchParams.delete("message");
        window.history.replaceState({}, "", url.toString());
      }
    }
  }, [searchParams]);

  const fetchData = useCallback(async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/portal/${token}`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Failed to load portal data");
      }
      
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token, fetchData]);

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

  // Loading state
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Chargement de vos informations...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Lien invalide ou expiré
              </h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <p className="text-sm text-gray-500">
                Veuillez contacter votre créancier pour obtenir un nouveau lien.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const { client, creditor, debts, paymentHistory, summary } = data;

  return (
    <div className="pb-24">
      {/* Payment Status Toast */}
      {paymentStatus && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center gap-3 ${
            paymentStatus === "success"
              ? "bg-green-50 border border-green-200"
              : "bg-red-50 border border-red-200"
          }`}
        >
          {paymentStatus === "success" ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : (
            <XCircle className="w-5 h-5 text-red-500" />
          )}
          <div>
            <p
              className={`font-medium ${
                paymentStatus === "success" ? "text-green-800" : "text-red-800"
              }`}
            >
              {paymentStatus === "success" ? "Paiement réussi!" : "Erreur de paiement"}
            </p>
            <p
              className={`text-sm ${
                paymentStatus === "success" ? "text-green-600" : "text-red-600"
              }`}
            >
              {paymentMessage}
            </p>
          </div>
          <button
            onClick={() => {
              setPaymentStatus(null);
              setPaymentMessage(null);
            }}
            className="ml-4 text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>
      )}

      {/* Welcome Section */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Bonjour, {client.name}
            </h1>
            <p className="text-gray-600">
              Bienvenue sur votre portail de paiement
            </p>
          </div>
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Factures en attente</p>
                <p className="text-2xl font-bold text-gray-900">{summary.totalDebts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">En retard</p>
                <p className="text-2xl font-bold text-red-600">{summary.overdueCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100">Montant total dû</p>
                <p className="text-3xl font-bold">
                  {formatCurrency(summary.totalOwed, debts[0]?.currency || "GNF")}
                </p>
                {summary.totalPaid > 0 && (
                  <p className="text-sm text-orange-100 mt-1">
                    Déjà payé: {formatCurrency(summary.totalPaid, debts[0]?.currency || "GNF")}
                  </p>
                )}
              </div>
              <CreditCard className="w-12 h-12 text-orange-300" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Debt Summary (Alternative detailed view) */}
      <div className="mb-8">
        <DebtSummary debts={debts} />
      </div>

      {/* Creditor Info & Contact */}
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        {/* Creditor Info Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-gray-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">Créancier</p>
                <p className="font-medium text-gray-900">{creditor.name}</p>
              </div>
              <div className="text-right text-sm text-gray-500">
                {creditor.phone && <p>Tél: {creditor.phone}</p>}
                <p>{creditor.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Contact Card */}
        <ContactCard creditor={creditor} />
      </div>

      {/* Token Expiration Notice */}
      <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-sm text-blue-700">
        <Clock className="w-4 h-4" />
        <span>
          Ce lien est valide jusqu&apos;au {formatDate(data.token.expiresAt)}
        </span>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="invoices" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Factures</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            <span className="hidden sm:inline">Historique</span>
          </TabsTrigger>
          <TabsTrigger value="contact" className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Contact</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoices">
          <DebtsList
            token={token}
            debts={debts}
            onPaymentSuccess={fetchData}
          />
        </TabsContent>

        <TabsContent value="history">
          <PaymentHistory payments={paymentHistory} debts={debts} />
        </TabsContent>

        <TabsContent value="contact" id="contact">
          <ContactSupport token={token} client={client} debts={debts} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
