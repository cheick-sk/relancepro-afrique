"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { 
  CreditCard, 
  Smartphone, 
  Building2, 
  Loader2,
  Shield,
  Check
} from "lucide-react";
import { toast } from "sonner";

interface Debt {
  id: string;
  reference: string | null;
  amount: number;
  paidAmount: number;
  balance: number;
  currency: string;
}

interface PaymentFormProps {
  token: string;
  debt?: Debt;
  totalAmount?: number;
  currency?: string;
  onSuccess: () => void;
}

export function PaymentForm({ token, debt, totalAmount, currency, onSuccess }: PaymentFormProps) {
  const [paymentMethod, setPaymentMethod] = useState<"card" | "mobile_money">("card");
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState<number>(debt?.balance || totalAmount || 0);
  const [isPartial, setIsPartial] = useState(false);
  const [loading, setLoading] = useState(false);

  const maxAmount = debt?.balance || totalAmount || 0;
  const displayCurrency = debt?.currency || currency || "GNF";

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: displayCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handlePayment = async () => {
    if (!email || !email.includes("@")) {
      toast.error("Veuillez entrer une adresse email valide");
      return;
    }

    if (amount <= 0 || amount > maxAmount) {
      toast.error("Montant invalide");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/portal/${token}/pay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          debtId: debt?.id,
          amount,
          email,
          paymentMethod,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erreur lors de l'initialisation du paiement");
      }

      // Redirect to Paystack
      if (result.data?.authorizationUrl) {
        window.location.href = result.data.authorizationUrl;
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast.error(error instanceof Error ? error.message : "Erreur lors du paiement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Amount Section */}
      <div className="space-y-4">
        <Label>Montant à payer</Label>
        
        {debt && (
          <div className="flex items-center gap-4 mb-2">
            <Button
              type="button"
              variant={!isPartial ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setIsPartial(false);
                setAmount(debt.balance);
              }}
              className={!isPartial ? "bg-orange-500 hover:bg-orange-600" : ""}
            >
              Montant total
            </Button>
            <Button
              type="button"
              variant={isPartial ? "default" : "outline"}
              size="sm"
              onClick={() => setIsPartial(true)}
              className={isPartial ? "bg-orange-500 hover:bg-orange-600" : ""}
            >
              Paiement partiel
            </Button>
          </div>
        )}

        <div className="relative">
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            disabled={!isPartial && !!debt}
            className="text-xl font-semibold h-14 pr-24"
            max={maxAmount}
            min={1}
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
            {displayCurrency}
          </div>
        </div>

        {debt && isPartial && (
          <p className="text-sm text-gray-500">
            Maximum: {formatCurrency(maxAmount)}
          </p>
        )}

        {debt && (
          <div className="bg-gray-50 p-3 rounded-lg text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Montant facture:</span>
              <span>{formatCurrency(debt.amount)}</span>
            </div>
            <div className="flex justify-between text-gray-600 mt-1">
              <span>Déjà payé:</span>
              <span className="text-green-600">-{formatCurrency(debt.paidAmount)}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between font-medium text-gray-900">
              <span>Reste à payer:</span>
              <span>{formatCurrency(debt.balance)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email">Email pour la confirmation</Label>
        <Input
          id="email"
          type="email"
          placeholder="votre@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <p className="text-xs text-gray-500">
          Vous recevrez une confirmation de paiement à cette adresse
        </p>
      </div>

      {/* Payment Method */}
      <div className="space-y-3">
        <Label>Mode de paiement</Label>
        <RadioGroup
          value={paymentMethod}
          onValueChange={(v) => setPaymentMethod(v as "card" | "mobile_money")}
          className="grid grid-cols-2 gap-3"
        >
          <div>
            <RadioGroupItem
              value="card"
              id="card"
              className="peer sr-only"
            />
            <Label
              htmlFor="card"
              className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-transparent p-4 hover:bg-gray-50 peer-data-[state=checked]:border-orange-500 [&:has(:checked)]:border-orange-500 cursor-pointer"
            >
              <CreditCard className="w-8 h-8 mb-2 text-gray-600" />
              <span className="font-medium">Carte</span>
              <span className="text-xs text-gray-500">Visa, Mastercard</span>
            </Label>
          </div>
          <div>
            <RadioGroupItem
              value="mobile_money"
              id="mobile_money"
              className="peer sr-only"
            />
            <Label
              htmlFor="mobile_money"
              className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-transparent p-4 hover:bg-gray-50 peer-data-[state=checked]:border-orange-500 [&:has(:checked)]:border-orange-500 cursor-pointer"
            >
              <Smartphone className="w-8 h-8 mb-2 text-gray-600" />
              <span className="font-medium">Mobile Money</span>
              <span className="text-xs text-gray-500">Orange, MTN, Wave</span>
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Trust Badges */}
      <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <Shield className="w-4 h-4 text-green-500" />
          <span>Paiement sécurisé</span>
        </div>
        <div className="flex items-center gap-1">
          <Check className="w-4 h-4 text-green-500" />
          <span>Confirmation instantanée</span>
        </div>
      </div>

      {/* Pay Button */}
      <Button
        className="w-full h-14 text-lg bg-orange-500 hover:bg-orange-600"
        onClick={handlePayment}
        disabled={loading || !email || amount <= 0}
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Redirection...
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5 mr-2" />
            Payer {formatCurrency(amount)}
          </>
        )}
      </Button>

      {/* Bank Transfer Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
        <div className="flex items-start gap-2">
          <Building2 className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-blue-800">Virement bancaire</p>
            <p className="text-blue-600 mt-1">
              Pour payer par virement bancaire, veuillez contacter votre créancier
              pour obtenir les coordonnées bancaires.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
