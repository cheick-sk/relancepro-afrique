"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  FileText, 
  AlertCircle, 
  Clock, 
  CreditCard,
  TrendingUp,
  Calendar
} from "lucide-react";

interface Debt {
  id: string;
  reference: string | null;
  amount: number;
  paidAmount: number;
  balance: number;
  currency: string;
  dueDate: string;
  status: string;
  isOverdue: boolean;
}

interface DebtSummaryProps {
  debts: Debt[];
}

export function DebtSummary({ debts }: DebtSummaryProps) {
  const totalAmount = debts.reduce((sum, debt) => sum + debt.amount, 0);
  const totalPaid = debts.reduce((sum, debt) => sum + debt.paidAmount, 0);
  const totalOwed = totalAmount - totalPaid;
  const overdueDebts = debts.filter((debt) => debt.isOverdue);
  const overdueAmount = overdueDebts.reduce((sum, debt) => sum + debt.balance, 0);
  
  // Get next due date (excluding overdue)
  const pendingDebts = debts.filter((debt) => !debt.isOverdue);
  const nextDueDebt = pendingDebts.sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  )[0];

  const currency = debts[0]?.currency || "GNF";
  const paidPercentage = totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0;

  const formatCurrency = (amount: number) => {
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

  const getDaysUntilDue = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="space-y-6">
      {/* Main Summary Card */}
      <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white overflow-hidden relative">
        <CardContent className="pt-6 pb-8">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5 text-orange-200" />
              <span className="text-orange-100 font-medium">Montant total dû</span>
            </div>
            
            <p className="text-4xl font-bold mb-4">
              {formatCurrency(totalOwed)}
            </p>
            
            {totalPaid > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-orange-100">
                  <span>Progression des paiements</span>
                  <span>{paidPercentage}% payé</span>
                </div>
                <Progress 
                  value={paidPercentage} 
                  className="h-2 bg-white/20 [&>div]:bg-white"
                />
                <p className="text-sm text-orange-100">
                  Déjà payé: {formatCurrency(totalPaid)} sur {formatCurrency(totalAmount)}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Debts */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Factures</p>
                <p className="text-xl font-bold text-gray-900">{debts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overdue */}
        <Card className={overdueDebts.length > 0 ? "border-red-200 bg-red-50" : ""}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                overdueDebts.length > 0 ? "bg-red-100" : "bg-gray-100"
              }`}>
                <AlertCircle className={`w-5 h-5 ${
                  overdueDebts.length > 0 ? "text-red-600" : "text-gray-400"
                }`} />
              </div>
              <div>
                <p className="text-xs text-gray-500">En retard</p>
                <p className={`text-xl font-bold ${
                  overdueDebts.length > 0 ? "text-red-600" : "text-gray-900"
                }`}>
                  {overdueDebts.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overdue Amount */}
        <Card className={overdueAmount > 0 ? "border-red-200" : ""}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                overdueAmount > 0 ? "bg-red-100" : "bg-gray-100"
              }`}>
                <TrendingUp className={`w-5 h-5 ${
                  overdueAmount > 0 ? "text-red-600" : "text-gray-400"
                }`} />
              </div>
              <div>
                <p className="text-xs text-gray-500">Montant retard</p>
                <p className={`text-lg font-bold ${
                  overdueAmount > 0 ? "text-red-600" : "text-gray-900"
                }`}>
                  {formatCurrency(overdueAmount)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next Due */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Prochaine échéance</p>
                {nextDueDebt ? (
                  <>
                    <p className="text-lg font-bold text-gray-900">
                      {getDaysUntilDue(nextDueDebt.dueDate)} jours
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(nextDueDebt.dueDate)}
                    </p>
                  </>
                ) : (
                  <p className="text-lg font-bold text-gray-400">-</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Status */}
      {totalOwed > 0 && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  overdueDebts.length > 0 
                    ? "bg-red-100" 
                    : pendingDebts.length > 0 
                      ? "bg-yellow-100" 
                      : "bg-green-100"
                }`}>
                  <Clock className={`w-5 h-5 ${
                    overdueDebts.length > 0 
                      ? "text-red-600" 
                      : pendingDebts.length > 0 
                        ? "text-yellow-600" 
                        : "text-green-600"
                  }`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Statut de paiement</p>
                  <p className="text-sm text-gray-500">
                    {overdueDebts.length > 0 
                      ? `${overdueDebts.length} facture${overdueDebts.length > 1 ? "s" : ""} en retard` 
                      : pendingDebts.length > 0 
                        ? `${pendingDebts.length} facture${pendingDebts.length > 1 ? "s" : ""} en attente`
                        : "Toutes les factures sont payées"}
                  </p>
                </div>
              </div>
              {overdueDebts.length > 0 && (
                <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                  Action requise
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
