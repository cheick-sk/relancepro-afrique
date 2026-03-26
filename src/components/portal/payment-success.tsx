"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle2, 
  Download, 
  Printer, 
  Share2,
  Receipt,
  Calendar,
  CreditCard,
  Building2,
  ArrowRight
} from "lucide-react";
import { toast } from "sonner";

interface PaymentSuccessProps {
  payment: {
    id: string;
    amount: number;
    currency: string;
    paidAt: string;
    paymentMethod: string | null;
    paystackRef: string;
  };
  debt?: {
    id: string;
    reference: string | null;
    amount: number;
    paidAmount: number;
    balance: number;
    currency: string;
  } | null;
  creditor: {
    name: string;
    email: string;
  };
  clientName: string;
  onBack: () => void;
}

export function PaymentSuccess({ 
  payment, 
  debt, 
  creditor, 
  clientName,
  onBack 
}: PaymentSuccessProps) {
  const [downloading, setDownloading] = useState(false);

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
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPaymentMethodLabel = (method: string | null) => {
    switch (method) {
      case "card":
        return "Carte bancaire";
      case "mobile_money":
        return "Mobile Money";
      case "bank_transfer":
        return "Virement bancaire";
      default:
        return "Paiement en ligne";
    }
  };

  const handleDownloadReceipt = async () => {
    setDownloading(true);
    try {
      // Generate receipt content
      const receiptContent = generateReceiptContent();
      
      // Create a blob and download
      const blob = new Blob([receiptContent], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `recu-${payment.paystackRef}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success("Reçu téléchargé");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Erreur lors du téléchargement");
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(generateReceiptContent());
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: "Reçu de paiement",
      text: `Paiement de ${formatCurrency(payment.amount, payment.currency)} effectué avec succès`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled share
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(
        `Reçu de paiement: ${formatCurrency(payment.amount, payment.currency)} - Réf: ${payment.paystackRef}`
      );
      toast.success("Informations copiées");
    }
  };

  const generateReceiptContent = () => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Reçu de paiement</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; }
    .header { text-align: center; margin-bottom: 40px; }
    .logo { font-size: 24px; font-weight: bold; color: #f97316; }
    .title { font-size: 20px; margin-top: 20px; color: #333; }
    .success-badge { 
      display: inline-block; 
      background: #dcfce7; 
      color: #166534; 
      padding: 8px 16px; 
      border-radius: 20px; 
      margin: 20px 0;
    }
    .section { margin: 30px 0; }
    .section-title { font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
    .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
    .info-label { color: #666; }
    .info-value { font-weight: 600; }
    .amount { font-size: 32px; color: #333; text-align: center; margin: 30px 0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">Relance<span style="color: #333;">Pro</span> Africa</div>
    <div class="title">Reçu de paiement</div>
    <div class="success-badge">✓ Paiement confirmé</div>
  </div>
  
  <div class="amount">${formatCurrency(payment.amount, payment.currency)}</div>
  
  <div class="section">
    <div class="section-title">Détails du paiement</div>
    <div class="info-row">
      <span class="info-label">Référence</span>
      <span class="info-value">${payment.paystackRef}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Date</span>
      <span class="info-value">${formatDate(payment.paidAt)}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Méthode</span>
      <span class="info-value">${getPaymentMethodLabel(payment.paymentMethod)}</span>
    </div>
    ${debt ? `
    <div class="info-row">
      <span class="info-label">Facture</span>
      <span class="info-value">${debt.reference || `#${debt.id.slice(-6)}`}</span>
    </div>
    ` : ""}
  </div>
  
  <div class="section">
    <div class="section-title">Informations</div>
    <div class="info-row">
      <span class="info-label">Client</span>
      <span class="info-value">${clientName}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Créancier</span>
      <span class="info-value">${creditor.name}</span>
    </div>
  </div>
  
  ${debt && debt.balance > 0 ? `
  <div class="section" style="background: #fef3c7; padding: 15px; border-radius: 8px;">
    <div class="info-row" style="border: none;">
      <span class="info-label">Reste à payer</span>
      <span class="info-value">${formatCurrency(debt.balance, debt.currency)}</span>
    </div>
  </div>
  ` : ""}
  
  <div class="footer">
    <p>Merci pour votre paiement</p>
    <p>${creditor.name} • ${creditor.email}</p>
    <p style="margin-top: 10px;">Généré par RelancePro Africa</p>
  </div>
</body>
</html>
    `;
  };

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-green-800 mb-2">
            Paiement réussi!
          </h2>
          <p className="text-green-600">
            Votre paiement a été traité avec succès
          </p>
        </CardContent>
      </Card>

      {/* Payment Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-orange-500" />
            Détails du paiement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Amount */}
          <div className="text-center py-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Montant payé</p>
            <p className="text-4xl font-bold text-gray-900">
              {formatCurrency(payment.amount, payment.currency)}
            </p>
          </div>

          {/* Info Grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="font-medium">{formatDate(payment.paidAt)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Méthode</p>
                <p className="font-medium">{getPaymentMethodLabel(payment.paymentMethod)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:col-span-2">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <Receipt className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Référence</p>
                <p className="font-mono font-medium">{payment.paystackRef}</p>
              </div>
            </div>
          </div>

          {/* Debt Info */}
          {debt && (
            <>
              <Separator />
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-2">Facture</p>
                <p className="font-semibold">{debt.reference || `Facture #${debt.id.slice(-6)}`}</p>
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Montant initial</span>
                    <span>{formatCurrency(debt.amount, debt.currency)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Déjà payé (avant)</span>
                    <span>{formatCurrency(debt.paidAmount - payment.amount, debt.currency)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Ce paiement</span>
                    <span className="text-green-600">+{formatCurrency(payment.amount, debt.currency)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between font-medium">
                    <span>Reste à payer</span>
                    <span className={debt.balance > 0 ? "text-orange-600" : "text-green-600"}>
                      {formatCurrency(debt.balance, debt.currency)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Creditor Info */}
          <Separator />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Créancier</p>
              <p className="font-medium">{creditor.name}</p>
              <p className="text-sm text-gray-500">{creditor.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Button
          variant="outline"
          onClick={handleDownloadReceipt}
          disabled={downloading}
        >
          <Download className="w-4 h-4 mr-2" />
          Télécharger
        </Button>
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-2" />
          Imprimer
        </Button>
        <Button variant="outline" onClick={handleShare}>
          <Share2 className="w-4 h-4 mr-2" />
          Partager
        </Button>
      </div>

      {/* Back Button */}
      <Button
        variant="ghost"
        className="w-full"
        onClick={onBack}
      >
        <ArrowRight className="w-4 h-4 mr-2" />
        Retour aux factures
      </Button>
    </div>
  );
}
