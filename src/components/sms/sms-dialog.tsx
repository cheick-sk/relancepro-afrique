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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  MessageSquare,
  Loader2,
  Phone,
  AlertCircle,
  Info,
  Sparkles,
  DollarSign,
  Users,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { estimateSMSCost, validateAfricanPhone, generateSMSReminder } from "@/lib/sms/provider";
import { MESSAGE_TEMPLATES, SMS_PRICING, calculateSegments } from "@/lib/sms/config";
import { MessageTemplate } from "@/lib/sms/config";

interface Client {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
}

interface SMSDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients?: Client[];
  selectedClient?: Client | null;
  onSuccess: () => void;
  defaultTemplate?: string;
  contextData?: {
    amount?: string;
    currency?: string;
    dueDate?: string;
    reference?: string;
    companyName?: string;
  };
}

export function SMSDialog({
  open,
  onOpenChange,
  clients = [],
  selectedClient,
  onSuccess,
  defaultTemplate,
  contextData,
}: SMSDialogProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [useTemplate, setUseTemplate] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState(defaultTemplate || "sms_reminder_1_fr");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setUseTemplate(true);
      setMessage("");
      setSearchQuery("");
      if (selectedClient) {
        setSelectedRecipients([selectedClient.id]);
      } else {
        setSelectedRecipients([]);
      }
      if (defaultTemplate) {
        setSelectedTemplateId(defaultTemplate);
      }
    }
  }, [open, selectedClient, defaultTemplate]);

  // Filter clients by search query
  const filteredClients = useMemo(() => {
    if (!searchQuery) return clients;
    const query = searchQuery.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.phone?.toLowerCase().includes(query) ||
        c.email?.toLowerCase().includes(query)
    );
  }, [clients, searchQuery]);

  // Get selected template
  const selectedTemplate = useMemo(() => {
    return MESSAGE_TEMPLATES.find((t) => t.id === selectedTemplateId);
  }, [selectedTemplateId]);

  // Generate message from template
  const templateMessage = useMemo(() => {
    if (!selectedTemplate || !contextData) return "";

    let filled = selectedTemplate.body;
    filled = filled.replace(/{{clientName}}/g, contextData.companyName || "Client");
    filled = filled.replace(/{{reference}}/g, contextData.reference || "N/A");
    filled = filled.replace(/{{amount}}/g, contextData.amount || "0");
    filled = filled.replace(/{{currency}}/g, contextData.currency || "GNF");
    filled = filled.replace(/{{dueDate}}/g, contextData.dueDate || new Date().toLocaleDateString('fr-FR'));
    filled = filled.replace(/{{companyName}}/g, contextData.companyName || "Notre entreprise");
    return filled;
  }, [selectedTemplate, contextData]);

  // Final message
  const finalMessage = useTemplate ? templateMessage : message;

  // Character count and segments
  const charCount = finalMessage.length;
  const segments = calculateSegments(finalMessage);

  // Get recipients with phone numbers
  const recipientsWithPhone = useMemo(() => {
    return selectedRecipients
      .map((id) => clients.find((c) => c.id === id))
      .filter((c): c is Client => !!c && !!c.phone);
  }, [selectedRecipients, clients]);

  // Calculate total cost
  const costEstimate = useMemo(() => {
    if (recipientsWithPhone.length === 0 || !finalMessage) return null;

    let totalCost = 0;
    let totalSegments = 0;

    for (const recipient of recipientsWithPhone) {
      if (recipient.phone) {
        const estimate = estimateSMSCost(finalMessage, recipient.phone);
        totalCost += estimate.cost;
        totalSegments += estimate.segments;
      }
    }

    return {
      totalCost,
      totalSegments,
      recipientCount: recipientsWithPhone.length,
    };
  }, [recipientsWithPhone, finalMessage]);

  // Toggle recipient selection
  const toggleRecipient = (clientId: string) => {
    setSelectedRecipients((prev) =>
      prev.includes(clientId)
        ? prev.filter((id) => id !== clientId)
        : [...prev, clientId]
    );
  };

  // Select all filtered clients
  const selectAllFiltered = () => {
    const filteredIds = filteredClients
      .filter((c) => c.phone)
      .map((c) => c.id);
    setSelectedRecipients(filteredIds);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedRecipients([]);
  };

  // Handle send
  const handleSend = async () => {
    if (recipientsWithPhone.length === 0) {
      toast.error("Aucun destinataire avec numéro de téléphone");
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
      // If single recipient, use single SMS endpoint
      if (recipientsWithPhone.length === 1) {
        const recipient = recipientsWithPhone[0];
        const response = await fetch("/api/sms/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: recipient.phone,
            message: finalMessage,
            clientId: recipient.id,
          }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          toast.success("SMS envoyé avec succès !");
          onSuccess();
          onOpenChange(false);
        } else {
          toast.error(data.error || "Erreur lors de l'envoi du SMS");
        }
      } else {
        // Bulk SMS
        const response = await fetch("/api/sms/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipients: recipientsWithPhone.map((r) => r.phone),
            message: finalMessage,
          }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          toast.success(data.message || "SMS envoyés avec succès !");
          onSuccess();
          onOpenChange(false);
        } else {
          toast.error(data.error || "Erreur lors de l'envoi des SMS");
        }
      }
    } catch (error) {
      console.error("Error sending SMS:", error);
      toast.error("Erreur lors de l'envoi du SMS");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-orange-500" />
            Composer un SMS
          </DialogTitle>
          <DialogDescription>
            Envoyez un SMS à vos clients pour les rappels de paiement
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Recipient Selection */}
          {clients.length > 0 && !selectedClient && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Sélectionner les destinataires</Label>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={selectAllFiltered}
                    className="text-xs"
                  >
                    Tout sélectionner
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSelection}
                    className="text-xs"
                  >
                    Effacer
                  </Button>
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher un client..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Client List */}
              <ScrollArea className="h-40 border rounded-md">
                <div className="p-2 space-y-1">
                  {filteredClients.map((client) => (
                    <div
                      key={client.id}
                      className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer"
                      onClick={() => client.phone && toggleRecipient(client.id)}
                    >
                      <Checkbox
                        checked={selectedRecipients.includes(client.id)}
                        disabled={!client.phone}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{client.name}</p>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Phone className="h-3 w-3" />
                          {client.phone || "Pas de téléphone"}
                        </div>
                      </div>
                      {client.phone && (
                        <Badge variant="outline" className="text-xs">
                          {validateAfricanPhone(client.phone).country || "OK"}
                        </Badge>
                      )}
                    </div>
                  ))}
                  {filteredClients.length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      Aucun client trouvé
                    </div>
                  )}
                </div>
              </ScrollArea>

              <p className="text-xs text-gray-500">
                {selectedRecipients.length} client(s) sélectionné(s) •{" "}
                {recipientsWithPhone.length} avec numéro valide
              </p>
            </div>
          )}

          {/* Selected client display */}
          {selectedClient && (
            <Card className="bg-gray-50 dark:bg-gray-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{selectedClient.name}</p>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                      <Phone className="h-3 w-3" />
                      {selectedClient.phone || "Pas de téléphone"}
                    </div>
                  </div>
                  {selectedClient.phone && (
                    <Badge variant="default">
                      {validateAfricanPhone(selectedClient.phone).country || "Valide"}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Template Selection */}
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

          {/* Template Selection Dropdown */}
          {useTemplate && (
            <div className="space-y-2">
              <Label>Choisir un template</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MESSAGE_TEMPLATES.filter((t) => t.type === "sms").map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Message Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Message</Label>
              <span
                className={`text-xs ${
                  charCount > 1530 ? "text-red-500" : "text-gray-500"
                }`}
              >
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
                {segments} segment{segments > 1 ? "s" : ""} SMS
              </span>
              <span>~160 caractères par segment</span>
            </div>
          </div>

          {/* Cost Estimation */}
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
                      {costEstimate.totalCost.toLocaleString()} GNF
                    </p>
                    <p className="text-xs text-gray-500">
                      {costEstimate.recipientCount} destinataire(s) •{" "}
                      {costEstimate.totalSegments} segment(s)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* No phone warning */}
          {selectedRecipients.length > 0 && recipientsWithPhone.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              Aucun des clients sélectionnés n'a de numéro de téléphone valide
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            className="bg-orange-500 hover:bg-orange-600"
            onClick={handleSend}
            disabled={loading || recipientsWithPhone.length === 0}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <MessageSquare className="mr-2 h-4 w-4" />
            )}
            Envoyer {recipientsWithPhone.length > 1 ? `(${recipientsWithPhone.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
