"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Mail, MessageSquare, Send } from "lucide-react";
import { Debt } from "@/types";
import { formatCurrency } from "@/components/shared/status-badge";
import { toast } from "sonner";

interface SendReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debt: Debt | null;
  onSuccess: () => void;
}

export function SendReminderDialog({
  open,
  onOpenChange,
  debt,
  onSuccess,
}: SendReminderDialogProps) {
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<"email" | "whatsapp">("email");
  const [customMessage, setCustomMessage] = useState("");

  if (!debt) return null;

  const client = debt.client as {
    name: string;
    email?: string | null;
    phone?: string | null;
  };

  const hasEmail = !!client?.email;
  const hasPhone = !!client?.phone;

  const handleSend = async () => {
    if (!hasEmail && !hasPhone) {
      toast.error("Le client n'a ni email ni téléphone");
      return;
    }

    if (type === "email" && !hasEmail) {
      toast.error("Le client n'a pas d'adresse email");
      return;
    }

    if (type === "whatsapp" && !hasPhone) {
      toast.error("Le client n'a pas de numéro WhatsApp");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/reminders/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          debtId: debt.id,
          type,
          customMessage: customMessage || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(
          `Relance ${type === "email" ? "email" : "WhatsApp"} envoyée avec succès !`
        );
        onSuccess();
        onOpenChange(false);
        setCustomMessage("");
      } else {
        toast.error(data.error || "Erreur lors de l'envoi");
      }
    } catch (error) {
      console.error("Error sending reminder:", error);
      toast.error("Erreur lors de l'envoi de la relance");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-orange-500" />
            Envoyer une relance
          </DialogTitle>
          <DialogDescription>
            Envoyez une relance à {client?.name || "ce client"} pour la créance{" "}
            {formatCurrency(debt.amount, debt.currency)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Client info */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <p className="font-medium text-gray-900 dark:text-white">
              {client?.name}
            </p>
            <div className="flex gap-4 mt-2 text-sm text-gray-500">
              {hasEmail && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {client.email}
                </span>
              )}
              {hasPhone && (
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {client.phone}
                </span>
              )}
            </div>
          </div>

          {/* Type selection */}
          <div className="space-y-2">
            <Label>Canal d&apos;envoi *</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as "email" | "whatsapp")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email" disabled={!hasEmail}>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-500" />
                    Email
                    {!hasEmail && " (non disponible)"}
                  </div>
                </SelectItem>
                <SelectItem value="whatsapp" disabled={!hasPhone}>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-green-500" />
                    WhatsApp
                    {!hasPhone && " (non disponible)"}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom message (optional) */}
          <div className="space-y-2">
            <Label>Message personnalisé (optionnel)</Label>
            <Textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Laissez vide pour utiliser le template automatique..."
              rows={3}
            />
            <p className="text-xs text-gray-500">
              Un message professionnel sera automatiquement généré si ce champ est vide.
            </p>
          </div>

          {/* Reminder count */}
          <div className="text-sm text-gray-500">
            Cette relance sera la <strong>n°{debt.reminderCount + 1}</strong>
            {debt.reminderCount >= 3 && (
              <span className="text-orange-500 ml-2">
                ⚠️ Le client a déjà reçu {debt.reminderCount} relances
              </span>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            className="bg-orange-500 hover:bg-orange-600"
            onClick={handleSend}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : type === "email" ? (
              <Mail className="mr-2 h-4 w-4" />
            ) : (
              <MessageSquare className="mr-2 h-4 w-4" />
            )}
            Envoyer {type === "email" ? "l'email" : "le WhatsApp"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
