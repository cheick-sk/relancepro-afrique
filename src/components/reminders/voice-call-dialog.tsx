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
import { Switch } from "@/components/ui/switch";
import {
  Phone,
  Loader2,
  AlertCircle,
  Info,
  Sparkles,
  DollarSign,
  Clock,
  Volume2,
  FileAudio,
  Calendar,
} from "lucide-react";
import { Debt } from "@/types";
import { formatCurrency } from "@/components/shared/status-badge";
import { toast } from "sonner";
import { 
  validateAfricanPhone, 
  estimateVoiceCost, 
  generateVoiceScript, 
  formatPhoneForDisplay 
} from "@/lib/sms/service";
import { VoiceLanguage, AFRICAN_COUNTRIES } from "@/lib/sms/types";

interface VoiceCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debt: Debt | null;
  onSuccess: () => void;
}

// Voice script templates
const VOICE_SCRIPTS = [
  {
    id: 'reminder_standard',
    name: 'Rappel standard',
    language: 'fr-FR' as VoiceLanguage,
    template: `Bonjour {{clientName}}. Je vous appelle de la part de {{companyName}}. 
    Nous vous contactons concernant votre facture numéro {{reference}}, 
    d'un montant de {{amount}} {{currency}}, qui reste impayée. 
    Nous vous prions de bien vouloir régulariser votre situation dans les meilleurs délais. 
    Pour toute question, veuillez nous contacter. Merci de votre compréhension.`,
  },
  {
    id: 'reminder_urgent',
    name: 'Rappel urgent',
    language: 'fr-FR' as VoiceLanguage,
    template: `Bonjour {{clientName}}. C'est un rappel urgent de {{companyName}}. 
    Votre facture de {{amount}} {{currency}} est toujours impayée. 
    Sans régularisation rapide, votre dossier sera transmis au service de recouvrement. 
    Merci de nous contacter immédiatement.`,
  },
  {
    id: 'reminder_english',
    name: 'Reminder (English)',
    language: 'en-US' as VoiceLanguage,
    template: `Hello {{clientName}}. This is a call from {{companyName}}. 
    We are contacting you regarding your invoice number {{reference}}, 
    with an amount of {{amount}} {{currency}}, which remains unpaid. 
    Please settle your account at your earliest convenience. 
    For any questions, please contact us. Thank you for your understanding.`,
  },
];

const LANGUAGES = [
  { code: 'fr-FR', name: 'Français (France)', flag: '🇫🇷' },
  { code: 'fr-SN', name: 'Français (Sénégal)', flag: '🇸🇳' },
  { code: 'en-US', name: 'English (US)', flag: '🇺🇸' },
  { code: 'en-GH', name: 'English (Ghana)', flag: '🇬🇭' },
  { code: 'en-NG', name: 'English (Nigeria)', flag: '🇳🇬' },
];

export function VoiceCallDialog({
  open,
  onOpenChange,
  debt,
  onSuccess,
}: VoiceCallDialogProps) {
  const [loading, setLoading] = useState(false);
  const [callType, setCallType] = useState<'tts' | 'audio'>('tts');
  const [message, setMessage] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [language, setLanguage] = useState<VoiceLanguage>('fr-FR');
  const [useTemplate, setUseTemplate] = useState(true);
  const [selectedScript, setSelectedScript] = useState(VOICE_SCRIPTS[0].id);
  const [scheduledCall, setScheduledCall] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  // Reset state when dialog opens
  useEffect(() => {
    if (open && debt) {
      setCallType('tts');
      setUseTemplate(true);
      setSelectedScript(VOICE_SCRIPTS[0].id);
      setMessage("");
      setAudioUrl("");
      setLanguage('fr-FR');
      setScheduledCall(false);
      setScheduledDate("");
      setScheduledTime("");
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

  // Get selected script
  const currentScript = VOICE_SCRIPTS.find(s => s.id === selectedScript) || VOICE_SCRIPTS[0];

  // Generate message from template
  const templateMessage = useMemo(() => {
    if (!debt || !client) return "";

    const companyName = "RelancePro Africa";
    const amount = formatCurrency(debt.amount, debt.currency).replace(/[^0-9.,]/g, '').trim();
    
    let msg = currentScript.template
      .replace('{{clientName}}', client.name)
      .replace('{{companyName}}', companyName)
      .replace('{{reference}}', debt.reference || 'en cours')
      .replace('{{amount}}', amount)
      .replace('{{currency}}', debt.currency)
      .replace(/\s+/g, ' ')
      .trim();

    return msg;
  }, [debt, client, currentScript]);

  // Final message
  const finalMessage = useTemplate ? templateMessage : message;

  // Character count
  const charCount = finalMessage.length;

  // Cost estimation
  const costEstimate = useMemo(() => {
    if (!client?.phone) return null;
    return estimateVoiceCost(client.phone, 1);
  }, [client?.phone]);

  // Scheduled datetime
  const scheduledAt = useMemo(() => {
    if (!scheduledCall || !scheduledDate || !scheduledTime) return null;
    return new Date(`${scheduledDate}T${scheduledTime}`);
  }, [scheduledCall, scheduledDate, scheduledTime]);

  // Validate scheduled time is in the future
  const isValidSchedule = useMemo(() => {
    if (!scheduledAt) return true;
    return scheduledAt > new Date();
  }, [scheduledAt]);

  // Handle call initiation
  const handleCall = async () => {
    if (!hasPhone || !client?.phone) {
      toast.error("Le client n'a pas de numéro de téléphone");
      return;
    }

    if (!phoneValidation?.valid) {
      toast.error(phoneValidation?.error || "Numéro de téléphone invalide");
      return;
    }

    if (callType === 'tts' && !finalMessage.trim()) {
      toast.error("Le message ne peut pas être vide");
      return;
    }

    if (callType === 'audio' && !audioUrl.trim()) {
      toast.error("L'URL du fichier audio est requise");
      return;
    }

    if (scheduledCall && !isValidSchedule) {
      toast.error("La date/heure planifiée doit être dans le futur");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/voice/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: client.phone,
          message: callType === 'tts' ? finalMessage : undefined,
          audioUrl: callType === 'audio' ? audioUrl : undefined,
          language: callType === 'tts' ? language : undefined,
          clientId: debt?.clientId,
          debtId: debt?.id,
          scheduledAt: scheduledAt?.toISOString(),
          useTemplate: useTemplate && callType === 'tts',
          templateParams: useTemplate && callType === 'tts' ? {
            clientName: client.name,
            amount: formatCurrency(debt.amount, debt.currency).replace(/[^0-9.,]/g, '').trim(),
            currency: debt.currency,
            reference: debt.reference,
          } : undefined,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(scheduledCall 
          ? "Appel vocal planifié avec succès !" 
          : "Appel vocal initié avec succès !");
        onSuccess();
        onOpenChange(false);
        setMessage("");
        setAudioUrl("");
      } else {
        toast.error(data.error || "Erreur lors de l'initiation de l'appel");
      }
    } catch (error) {
      console.error("Error initiating voice call:", error);
      toast.error("Erreur lors de l'initiation de l'appel");
    } finally {
      setLoading(false);
    }
  };

  if (!debt) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-orange-500" />
            Initier un appel vocal
          </DialogTitle>
          <DialogDescription>
            Envoyez un rappel vocal à {client?.name || "ce client"} pour la créance{" "}
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
                    {client?.phone ? formatPhoneForDisplay(client.phone) : "Non renseigné"}
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

          {/* Call type selection */}
          <div className="space-y-2">
            <Label>Type d'appel</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={callType === 'tts' ? "default" : "outline"}
                size="sm"
                onClick={() => setCallType('tts')}
                className={callType === 'tts' ? "bg-orange-500 hover:bg-orange-600" : ""}
              >
                <Volume2 className="h-4 w-4 mr-2" />
                Synthèse vocale
              </Button>
              <Button
                type="button"
                variant={callType === 'audio' ? "default" : "outline"}
                size="sm"
                onClick={() => setCallType('audio')}
                className={callType === 'audio' ? "bg-orange-500 hover:bg-orange-600" : ""}
              >
                <FileAudio className="h-4 w-4 mr-2" />
                Audio pré-enregistré
              </Button>
            </div>
          </div>

          {/* Text-to-speech options */}
          {callType === 'tts' && (
            <>
              {/* Language selection */}
              <div className="space-y-2">
                <Label>Langue de synthèse</Label>
                <Select
                  value={language}
                  onValueChange={(v) => setLanguage(v as VoiceLanguage)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.flag} {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Script template selection */}
              <div className="space-y-2">
                <Label>Script d'appel</Label>
                <div className="flex gap-2 mb-2">
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

                {useTemplate && (
                  <Select
                    value={selectedScript}
                    onValueChange={setSelectedScript}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VOICE_SCRIPTS.map((script) => (
                        <SelectItem key={script.id} value={script.id}>
                          {script.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Message input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Message vocal</Label>
                  <span className={`text-xs ${charCount > 1000 ? 'text-red-500' : 'text-gray-500'}`}>
                    {charCount}/1000
                  </span>
                </div>
                <Textarea
                  value={finalMessage}
                  onChange={(e) => {
                    if (!useTemplate) {
                      setMessage(e.target.value);
                    }
                  }}
                  placeholder="Votre message vocal..."
                  rows={6}
                  disabled={useTemplate}
                />
              </div>
            </>
          )}

          {/* Audio URL input */}
          {callType === 'audio' && (
            <div className="space-y-2">
              <Label>URL du fichier audio</Label>
              <Input
                value={audioUrl}
                onChange={(e) => setAudioUrl(e.target.value)}
                placeholder="https://example.com/audio.mp3"
              />
              <p className="text-xs text-gray-500">
                Formats supportés: MP3, WAV. Le fichier doit être accessible publiquement.
              </p>
            </div>
          )}

          {/* Call scheduling */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <Label className="cursor-pointer">Planifier l'appel</Label>
              </div>
              <Switch
                checked={scheduledCall}
                onCheckedChange={setScheduledCall}
              />
            </div>

            {scheduledCall && (
              <div className="grid grid-cols-2 gap-3 pl-6">
                <div className="space-y-2">
                  <Label className="text-xs">Date</Label>
                  <Input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Heure</Label>
                  <Input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                  />
                </div>
              </div>
            )}
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
                      ~{costEstimate.cost} GNF/min
                    </p>
                    <p className="text-xs text-gray-500">
                      {costEstimate.country}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Info box */}
          <div className="flex items-start gap-2 text-xs text-gray-500 bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">À propos des appels vocaux:</p>
              <ul className="mt-1 list-disc list-inside space-y-0.5">
                <li>Le client recevra un appel automatique avec votre message</li>
                <li>Les appels sont facturés à la minute</li>
                <li>Détection automatique du répondeur</li>
                <li>Enregistrement disponible après l'appel</li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            className="bg-orange-500 hover:bg-orange-600"
            onClick={handleCall}
            disabled={loading || !hasPhone || !phoneValidation?.valid || (scheduledCall && !isValidSchedule)}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : scheduledCall ? (
              <Clock className="mr-2 h-4 w-4" />
            ) : (
              <Phone className="mr-2 h-4 w-4" />
            )}
            {scheduledCall ? "Planifier l'appel" : "Appeler maintenant"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
