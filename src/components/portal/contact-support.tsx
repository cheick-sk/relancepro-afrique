"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  MessageCircle, 
  Send, 
  Clock,
  CheckCircle,
  AlertTriangle,
  Calendar,
  FileText,
  Upload
} from "lucide-react";

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

interface Debt {
  id: string;
  reference: string | null;
  amount: number;
  balance: number;
  currency: string;
}

interface ContactSupportProps {
  token: string;
  client: Client;
  debts: Debt[];
}

type MessageType = "contact" | "payment_plan_request" | "dispute";

export function ContactSupport({ token, client, debts }: ContactSupportProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [messageType, setMessageType] = useState<MessageType>("contact");
  const [selectedDebtId, setSelectedDebtId] = useState<string>("all");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getMessageTypeConfig = (type: MessageType) => {
    switch (type) {
      case "payment_plan_request":
        return {
          label: "Demande de plan de paiement",
          icon: <Calendar className="w-4 h-4" />,
          color: "bg-blue-100 text-blue-800",
          description: "Demandez un étalement de vos paiements",
        };
      case "dispute":
        return {
          label: "Contestation de facture",
          icon: <AlertTriangle className="w-4 h-4" />,
          color: "bg-red-100 text-red-800",
          description: "Signalez un problème avec une facture",
        };
      default:
        return {
          label: "Message général",
          icon: <MessageCircle className="w-4 h-4" />,
          color: "bg-gray-100 text-gray-800",
          description: "Contactez votre créancier pour toute question",
        };
    }
  };

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error("Veuillez entrer un message");
      return;
    }

    if (messageType !== "contact" && selectedDebtId === "all" && debts.length > 0) {
      toast.error("Veuillez sélectionner une facture spécifique");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/portal/${token}/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: messageType,
          subject: subject || getMessageTypeConfig(messageType).label,
          message,
          debtId: selectedDebtId !== "all" ? selectedDebtId : null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erreur lors de l'envoi du message");
      }

      setSuccess(true);
      toast.success("Message envoyé avec succès");
      
      // Reset form after delay
      setTimeout(() => {
        setDialogOpen(false);
        setSuccess(false);
        setMessage("");
        setSubject("");
        setSelectedDebtId("all");
        setMessageType("contact");
      }, 2000);
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'envoi");
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (type: MessageType) => {
    setMessageType(type);
    setDialogOpen(true);
    setSuccess(false);
  };

  return (
    <>
      <div className="space-y-6">
        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Contact */}
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openDialog("contact")}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Message général</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Posez une question à votre créancier
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Plan */}
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openDialog("payment_plan_request")}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Plan de paiement</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Demandez un étalement de vos paiements
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dispute */}
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openDialog("dispute")}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Contestation</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Signalez un problème avec une facture
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-blue-800">Temps de réponse</p>
                <p className="text-sm text-blue-600 mt-1">
                  Votre créancier vous répondra dans les meilleurs délais. 
                  Vous serez notifié par email dès qu&apos;une réponse sera disponible.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Message Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getMessageTypeConfig(messageType).icon}
              {getMessageTypeConfig(messageType).label}
            </DialogTitle>
            <DialogDescription>
              {getMessageTypeConfig(messageType).description}
            </DialogDescription>
          </DialogHeader>

          {success ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900">Message envoyé!</h3>
              <p className="text-gray-500 mt-2">
                Votre créancier vous répondra dans les meilleurs délais.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Debt Selection (for payment plan and disputes) */}
              {(messageType === "payment_plan_request" || messageType === "dispute") && (
                <div className="space-y-2">
                  <Label>Facture concernée</Label>
                  <Select value={selectedDebtId} onValueChange={setSelectedDebtId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une facture" />
                    </SelectTrigger>
                    <SelectContent>
                      {debts.map((debt) => (
                        <SelectItem key={debt.id} value={debt.id}>
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            <span>
                              {debt.reference || `Facture #${debt.id.slice(-6)}`}
                            </span>
                            <span className="text-gray-500">
                              ({formatCurrency(debt.balance, debt.currency)})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Subject */}
              <div className="space-y-2">
                <Label htmlFor="subject">Sujet</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Sujet de votre message"
                />
              </div>

              {/* Message */}
              <div className="space-y-2">
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    messageType === "payment_plan_request"
                      ? "Expliquez le plan de paiement que vous souhaitez proposer..."
                      : messageType === "dispute"
                      ? "Décrivez le problème avec cette facture..."
                      : "Votre message..."
                  }
                  rows={5}
                />
              </div>

              {/* Attachments (placeholder) */}
              <div className="space-y-2">
                <Label>Pièces jointes (optionnel)</Label>
                <Button variant="outline" type="button" className="w-full">
                  <Upload className="w-4 h-4 mr-2" />
                  Ajouter un fichier
                </Button>
                <p className="text-xs text-gray-500">
                  Formats acceptés: PDF, JPG, PNG (max 5MB)
                </p>
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading || !message.trim()}
                  className="flex-1 bg-orange-500 hover:bg-orange-600"
                >
                  {loading ? (
                    "Envoi en cours..."
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Envoyer
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
