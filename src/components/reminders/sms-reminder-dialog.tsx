"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  MessageSquare,
  Loader2,
  Phone,
  AlertCircle,
  Info,
  Sparkles,
  DollarSign,
} from "lucide-react";
import { Debt } from "@/types";
import { formatCurrency } from "@/components/shared/status-badge";
import { toast } from "sonner";
import { validateAfricanPhone, estimateSMSCost, generateSMSReminder } from "@/lib/sms/service";
import { AFRICAN_COUNTRIES } from "@/lib/sms/types";

interface SMSReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debt: Debt | null;
  onSuccess: () => void;
}

export function SMSReminderDialog({
  open,
  onOpenChange,
  debt,
  onSuccess,
}: SMSReminderDialogProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [useTemplate, setUseTemplate] = useState(true);
  const [reminderNumber, setReminderNumber] = useState<1 | 2 | 3>(1);

  // Reset state when dialog opens
  useEffect(() => {
    if (open && debt) {
      const count = debt.reminderCount + 1;
      setReminderNumber(Math.min(count, 3) as 1 | 2 | 3);
      setUseTemplate(true);
      setMessage("");
    }
  }, [open, debt]);

  const client = debt?.client as {
    name: string;
    email?: string | null;
    phone?: string | null;
  };

  const hasPhone = !!client?.phone;

  // Phone validation
  const phoneValidation = useMemo(() => {
    if (!client?.phone) return null;
    return validateAfricanPhone(client.phone);
  }, [client?.phone]);

  // Generate template message
  const templateMessage = useMemo(() => {
    if (!debt || !client) return "";
    
    return generateSMSReminder({
      clientName: client.name,
      amount: formatCurrency(debt.amount, debt.currency).replace(/[^0-9.,]/g, '').trim(),
      currency: debt.currency,
      dueDate: new Date(debt.dueDate).toLocaleDateString('fr-FR'),
      reference: debt.reference || undefined,
      reminderNumber,
      companyName: undefined,
    });
  }, [debt, client, reminderNumber]);

  // Final message to send
  const finalMessage = useTemplate ? templateMessage : message;

  // Character count and segments
  const charCount = finalMessage.length;
  const segments = Math.ceil(charCount / 160);

  // Cost estimation
  const costEstimate = useMemo(() => {
    if (!client?.phone || !finalMessage) return null;
    return estimateSMSCost(finalMessage, client.phone);
  }, [finalMessage, client?.phone]);

  // Handle send
  const handleSend = async () => {
    if (!hasPhone || !client?.phone) {
      toast.error("Le client n'a pas de numéro de téléphone");
      return;
    }

    if (!phoneValidation?.valid) {
      toast.error(phoneValidation?.error || "Numéro de téléphone invalide");
      return;
    }

    if (!finalMessage.trim()) {
      toast.error("Le message ne peut pas être vide");
      return;
    }

    if (charCount > 1530) {
      toast.error("Message trop long (max 1530 caractères)");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: client.phone,
          message: finalMessage,
          clientId: debt?.clientId,
          debtId: debt?.id,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success("SMS envoyé avec succès !");
        onSuccess();
        onOpenChange(false);
        setMessage("");
      } else {
        toast.error(data.error || "Erreur lors de l'envoi du SMS");
      }
    } catch (error) {
      console.error("Error sending SMS:", error);
      toast.error("Erreur lors de l'envoi du SMS");
    } finally {
      setLoading(false);
    }
  };

  if (!debt) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-orange-500" />
            Envoyer un SMS de rappel
          </DialogTitle>
          <DialogDescription>
            Envoyez un rappel par SMS à {client?.name || "ce client"} pour la créance{" "}
            {formatCurrency(debt.amount, debt.currency)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Client info */}
          <Card className="bg-gray-50 dark:bg-gray-800">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {client?.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                    <Phone className="h-3 w-3" />
                    {client?.phone || "Non renseigné"}
                  </div>
                </div>
                {phoneValidation && (
                  <Badge variant={phoneValidation.valid ? "default" : "destructive"}>
                    {phoneValidation.valid ? phoneValidation.country : "Invalide"}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Phone validation error */}
          {client?.phone && !phoneValidation?.valid && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              {phoneValidation?.error}
            </div>
          )}

          {/* Reminder type selection */}
          <div className="space-y-2">
            <Label>Type de message</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={useTemplate ? "default" : "outline"}
                size="sm"
                onClick={() => setUseTemplate(true)}
                className={useTemplate ? "bg-orange-500 hover:bg-orange-600" : ""}
              >
                <Sparkles className="h-4 w-4 mr-1" />
                Template
              </Button>
              <Button
                type="button"
                variant={!useTemplate ? "default" : "outline"}
                size="sm"
                onClick={() => setUseTemplate(false)}
                className={!useTemplate ? "bg-orange-500 hover:bg-orange-600" : ""}
              >
                Personnalisé
              </Button>
            </div>
          </div>

          {/* Template reminder number */}
          {useTemplate && (
            <div className="space-y-2">
              <Label>Numéro de rappel</Label>
              <Select
                value={reminderNumber.toString()}
                onValueChange={(v) => setReminderNumber(parseInt(v) as 1 | 2 | 3)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1er rappel - Courtois</SelectItem>
                  <SelectItem value="2">2ème rappel - Ferme</SelectItem>
                  <SelectItem value="3">3ème rappel - Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Message input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Message</Label>
              <span className={`text-xs ${charCount > 1530 ? 'text-red-500' : 'text-gray-500'}`}>
                {charCount}/1530
              </span>
            </div>
            <Textarea
              value={finalMessage}
              onChange={(e) => {
                if (!useTemplate) {
                  setMessage(e.target.value);
                }
              }}
              placeholder="Votre message..."
              rows={6}
              disabled={useTemplate}
              className={charCount > 160 ? "border-orange-300" : ""}
            />
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Info className="h-3 w-3" />
                {segments} segment{segments > 1 ? 's' : ''} SMS
              </span>
              <span>
                ~{segments * 160} caractères max par segment
              </span>
            </div>
          </div>

          {/* Cost estimation */}
          {costEstimate && (
            <Card className="bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-orange-500" />
                    <span className="font-medium">Estimation du coût</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-orange-600">
                      {costEstimate.cost} GNF
                    </p>
                    <p className="text-xs text-gray-500">
                      {costEstimate.country} • {costEstimate.segments} segment(s)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Supported countries info */}
          <div className="text-xs text-gray-500">
            <p className="font-medium mb-1">Pays supportés:</p>
            <div className="flex flex-wrap gap-1">
              {AFRICAN_COUNTRIES.map((country) => (
                <Badge key={country.code} variant="outline" className="text-xs">
                  {country.flag} {country.name}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            className="bg-orange-500 hover:bg-orange-600"
            onClick={handleSend}
            disabled={loading || !hasPhone || !phoneValidation?.valid}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <MessageSquare className="mr-2 h-4 w-4" />
            )}
            Envoyer le SMS
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
