"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  CreditCard, 
  Download, 
  FileText,
  Smartphone,
  Building2,
  Calendar
} from "lucide-react";

interface Payment {
  id: string;
  amount: number;
  currency: string;
  paidAt: string | null;
  paymentMethod: string | null;
  debtId: string | null;
}

interface Debt {
  id: string;
  reference: string | null;
}

interface PaymentHistoryProps {
  payments: Payment[];
  debts: Debt[];
}

export function PaymentHistory({ payments, debts }: PaymentHistoryProps) {
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const getPaymentMethodIcon = (method: string | null) => {
    switch (method) {
      case "card":
        return <CreditCard className="w-4 h-4" />;
      case "mobile_money":
        return <Smartphone className="w-4 h-4" />;
      case "bank_transfer":
        return <Building2 className="w-4 h-4" />;
      default:
        return <CreditCard className="w-4 h-4" />;
    }
  };

  const getPaymentMethodLabel = (method: string | null) => {
    switch (method) {
      case "card":
        return "Carte";
      case "mobile_money":
        return "Mobile Money";
      case "bank_transfer":
        return "Virement";
      default:
        return "Paiement";
    }
  };

  const getDebtReference = (debtId: string | null) => {
    if (!debtId) return null;
    const debt = debts.find((d) => d.id === debtId);
    return debt?.reference || `#${debtId.slice(-6)}`;
  };

  const handleDownloadReceipt = async (paymentId: string) => {
    // In a real implementation, this would generate/download a PDF receipt
    // For now, we'll just show a toast
    console.log("Download receipt for payment:", paymentId);
  };

  if (payments.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Aucun historique de paiement
            </h3>
            <p className="text-gray-500">
              Vos paiements apparaîtront ici une fois effectués.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-orange-500" />
          Historique des paiements
        </CardTitle>
        <CardDescription>
          {payments.length} paiement{payments.length > 1 ? "s" : ""} effectué
          {payments.length > 1 ? "s" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Mobile View */}
        <div className="md:hidden space-y-4">
          {payments.map((payment) => (
            <div
              key={payment.id}
              className="bg-gray-50 rounded-lg p-4 border border-gray-200"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-lg text-gray-900">
                  {formatCurrency(payment.amount, payment.currency)}
                </span>
                <Badge variant="secondary" className="gap-1">
                  {getPaymentMethodIcon(payment.paymentMethod)}
                  {getPaymentMethodLabel(payment.paymentMethod)}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                <Calendar className="w-4 h-4" />
                {formatDate(payment.paidAt)}
              </div>
              {payment.debtId && (
                <p className="text-sm text-gray-500 mb-3">
                  Facture: {getDebtReference(payment.debtId)}
                </p>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => handleDownloadReceipt(payment.id)}
              >
                <Download className="w-4 h-4 mr-2" />
                Télécharger le reçu
              </Button>
            </div>
          ))}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Méthode</TableHead>
                <TableHead>Facture</TableHead>
                <TableHead className="text-right">Reçu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {formatDate(payment.paidAt)}
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold">
                    {formatCurrency(payment.amount, payment.currency)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1">
                      {getPaymentMethodIcon(payment.paymentMethod)}
                      {getPaymentMethodLabel(payment.paymentMethod)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {payment.debtId ? (
                      <span className="text-gray-600">
                        {getDebtReference(payment.debtId)}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownloadReceipt(payment.id)}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      PDF
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Summary */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Total payé</span>
            <span className="text-xl font-bold text-gray-900">
              {formatCurrency(
                payments.reduce((sum, p) => sum + p.amount, 0),
                payments[0]?.currency || "GNF"
              )}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
