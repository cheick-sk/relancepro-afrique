"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PaymentForm } from "./payment-form";
import { 
  FileText, 
  Calendar, 
  CreditCard, 
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight
} from "lucide-react";

interface Debt {
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
}

interface DebtsListProps {
  token: string;
  debts: Debt[];
  onPaymentSuccess: () => void;
}

export function DebtsList({ token, debts, onPaymentSuccess }: DebtsListProps) {
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [payAllDialogOpen, setPayAllDialogOpen] = useState(false);

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
      month: "short",
      year: "numeric",
    });
  };

  const getStatusBadge = (debt: Debt) => {
    if (debt.isOverdue) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="w-3 h-3" />
          En retard
        </Badge>
      );
    }
    if (debt.status === "partial") {
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 gap-1">
          <Clock className="w-3 h-3" />
          Partiel
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1">
        <Clock className="w-3 h-3" />
        En attente
      </Badge>
    );
  };

  const getProgressPercentage = (debt: Debt) => {
    return Math.round((debt.paidAmount / debt.amount) * 100);
  };

  const handlePayDebt = (debt: Debt) => {
    setSelectedDebt(debt);
    setPaymentDialogOpen(true);
  };

  const handlePayAll = () => {
    setPayAllDialogOpen(true);
  };

  // Calculate total
  const totalBalance = debts.reduce((sum, debt) => sum + debt.balance, 0);
  const currency = debts[0]?.currency || "GNF";

  if (debts.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Aucune facture en attente
            </h3>
            <p className="text-gray-500">
              Vous n&apos;avez pas de factures en attente de paiement.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Summary Card */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm text-gray-500">Total à payer</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrency(totalBalance, currency)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {debts.length} facture{debts.length > 1 ? "s" : ""}
              </p>
            </div>
            <Button
              size="lg"
              className="bg-orange-500 hover:bg-orange-600"
              onClick={handlePayAll}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Tout payer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Debts List */}
      <div className="space-y-4">
        {debts.map((debt) => (
          <Card
            key={debt.id}
            className={`transition-shadow hover:shadow-md ${
              debt.isOverdue ? "border-red-200 bg-red-50/30" : ""
            }`}
          >
            <CardContent className="pt-6">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                {/* Debt Info */}
                <div className="flex-1">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        debt.isOverdue ? "bg-red-100" : "bg-gray-100"
                      }`}
                    >
                      <FileText
                        className={`w-5 h-5 ${
                          debt.isOverdue ? "text-red-500" : "text-gray-500"
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {debt.reference || `Facture #${debt.id.slice(-6)}`}
                        </h3>
                        {getStatusBadge(debt)}
                      </div>
                      {debt.description && (
                        <p className="text-sm text-gray-500 truncate">
                          {debt.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>
                            Échéance: {formatDate(debt.dueDate)}
                          </span>
                        </div>
                        {debt.issueDate && (
                          <span>Émise le {formatDate(debt.issueDate)}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar for Partial Payments */}
                  {debt.paidAmount > 0 && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-500">Payé</span>
                        <span className="font-medium">
                          {formatCurrency(debt.paidAmount, debt.currency)} /{" "}
                          {formatCurrency(debt.amount, debt.currency)}
                        </span>
                      </div>
                      <Progress value={getProgressPercentage(debt)} className="h-2" />
                    </div>
                  )}
                </div>

                {/* Amount and Action */}
                <div className="flex items-center gap-4 lg:flex-col lg:items-end">
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Reste à payer</p>
                    <p className="text-xl font-bold text-gray-900">
                      {formatCurrency(debt.balance, debt.currency)}
                    </p>
                  </div>
                  <Button
                    onClick={() => handlePayDebt(debt)}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    Payer
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Payment Dialog - Single Debt */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Paiement de facture</DialogTitle>
            <DialogDescription>
              {selectedDebt?.reference || `Facture #${selectedDebt?.id.slice(-6)}`}
            </DialogDescription>
          </DialogHeader>
          {selectedDebt && (
            <PaymentForm
              token={token}
              debt={selectedDebt}
              onSuccess={() => {
                setPaymentDialogOpen(false);
                onPaymentSuccess();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Dialog - All Debts */}
      <Dialog open={payAllDialogOpen} onOpenChange={setPayAllDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Paiement total</DialogTitle>
            <DialogDescription>
              Payez toutes vos factures en une seule transaction
            </DialogDescription>
          </DialogHeader>
          <PaymentForm
            token={token}
            totalAmount={totalBalance}
            currency={currency}
            onSuccess={() => {
              setPayAllDialogOpen(false);
              onPaymentSuccess();
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
