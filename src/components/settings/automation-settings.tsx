"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Bell,
  Clock,
  Globe,
  Mail,
  MessageSquare,
  Settings,
  Save,
  Loader2,
  Calendar,
  Eye,
  AlertTriangle,
  CheckCircle,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { SUPPORTED_TIMEZONES, DEFAULT_TIMEZONE, DEFAULT_QUIET_HOURS } from "@/lib/cron/config";

// =====================================================
// TYPES
// =====================================================

interface AutomationSettings {
  autoRemindEnabled: boolean;
  reminderDay1: number;
  reminderDay2: number;
  reminderDay3: number;
  timezone: string;
  quietHoursStart: string;
  quietHoursEnd: string;
  defaultChannel: "email" | "whatsapp" | "both";
  emailEnabled: boolean;
  whatsappEnabled: boolean;
}

interface DebtPreview {
  id: string;
  reference: string | null;
  clientName: string;
  amount: number;
  currency: string;
  dueDate: Date;
  daysOverdue: number;
  reminderCount: number;
  nextReminder: {
    date: Date | null;
    type: string;
  };
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export function AutomationSettings() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewDebts, setPreviewDebts] = useState<DebtPreview[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const [settings, setSettings] = useState<AutomationSettings>({
    autoRemindEnabled: true,
    reminderDay1: 3,
    reminderDay2: 7,
    reminderDay3: 14,
    timezone: DEFAULT_TIMEZONE,
    quietHoursStart: DEFAULT_QUIET_HOURS.start,
    quietHoursEnd: DEFAULT_QUIET_HOURS.end,
    defaultChannel: "email",
    emailEnabled: true,
    whatsappEnabled: true,
  });

  // Charger les paramètres existants
  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/settings");
        if (response.ok) {
          const data = await response.json();
          setSettings({
            autoRemindEnabled: data.settings?.autoRemindEnabled ?? true,
            reminderDay1: data.settings?.reminderDay1 || 3,
            reminderDay2: data.settings?.reminderDay2 || 7,
            reminderDay3: data.settings?.reminderDay3 || 14,
            timezone: data.settings?.timezone || DEFAULT_TIMEZONE,
            quietHoursStart: data.settings?.quietHoursStart || DEFAULT_QUIET_HOURS.start,
            quietHoursEnd: data.settings?.quietHoursEnd || DEFAULT_QUIET_HOURS.end,
            defaultChannel: data.settings?.defaultChannel || "email",
            emailEnabled: data.settings?.emailEnabled ?? true,
            whatsappEnabled: data.settings?.whatsappEnabled ?? true,
          });
        }
      } catch (error) {
        console.error("Erreur chargement paramètres:", error);
        toast.error("Erreur lors du chargement des paramètres");
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      fetchSettings();
    }
  }, [session]);

  // Sauvegarder les paramètres
  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast.success("Paramètres d'automatisation enregistrés");
      } else {
        toast.error("Erreur lors de l'enregistrement");
      }
    } catch (error) {
      console.error("Erreur sauvegarde:", error);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  // Charger l'aperçu des relances
  const loadPreview = async () => {
    setLoadingPreview(true);
    try {
      const response = await fetch("/api/debts?status=pending,partial&overdue=true");
      if (response.ok) {
        const data = await response.json();
        
        // Calculer les dates de prochaine relance pour chaque dette
        const debtsWithPreview = data.debts.map((debt: any) => {
          const dueDate = new Date(debt.dueDate);
          const daysOverdue = Math.floor(
            (Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          let nextReminderDate: Date | null = null;
          let nextReminderType = "";

          if (debt.reminderCount === 0) {
            nextReminderDate = new Date(dueDate);
            nextReminderDate.setDate(nextReminderDate.getDate() + settings.reminderDay1);
            nextReminderType = "1ère relance";
          } else if (debt.reminderCount === 1) {
            nextReminderDate = new Date(dueDate);
            nextReminderDate.setDate(nextReminderDate.getDate() + settings.reminderDay2);
            nextReminderType = "2ème relance";
          } else if (debt.reminderCount === 2) {
            nextReminderDate = new Date(dueDate);
            nextReminderDate.setDate(nextReminderDate.getDate() + settings.reminderDay3);
            nextReminderType = "3ème relance";
          }

          return {
            id: debt.id,
            reference: debt.reference,
            clientName: debt.client?.name || "Client inconnu",
            amount: debt.amount,
            currency: debt.currency,
            dueDate,
            daysOverdue,
            reminderCount: debt.reminderCount,
            nextReminder: {
              date: nextReminderDate && nextReminderDate > new Date() ? nextReminderDate : null,
              type: nextReminderType,
            },
          };
        });

        setPreviewDebts(debtsWithPreview);
        setPreviewDialogOpen(true);
      }
    } catch (error) {
      console.error("Erreur chargement aperçu:", error);
      toast.error("Erreur lors du chargement de l'aperçu");
    } finally {
      setLoadingPreview(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Activation des relances automatiques */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-orange-500" />
              <CardTitle>Relances automatiques</CardTitle>
            </div>
            <Switch
              checked={settings.autoRemindEnabled}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, autoRemindEnabled: checked })
              }
            />
          </div>
          <CardDescription>
            Activez l&apos;envoi automatique des relances aux dates programmées
          </CardDescription>
        </CardHeader>
        {settings.autoRemindEnabled && (
          <CardContent className="space-y-6">
            {/* Intervalles de relance */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                Intervalles des relances
              </h4>
              <p className="text-sm text-gray-500">
                Nombre de jours après l&apos;échéance pour chaque relance
              </p>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>1ère relance</Label>
                  <Select
                    value={settings.reminderDay1.toString()}
                    onValueChange={(v) =>
                      setSettings({ ...settings, reminderDay1: parseInt(v) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 5, 7].map((d) => (
                        <SelectItem key={d} value={d.toString()}>
                          J+{d} ({d} jour{d > 1 ? "s" : ""})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>2ème relance</Label>
                  <Select
                    value={settings.reminderDay2.toString()}
                    onValueChange={(v) =>
                      setSettings({ ...settings, reminderDay2: parseInt(v) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[5, 7, 10, 14].map((d) => (
                        <SelectItem key={d} value={d.toString()}>
                          J+{d} ({d} jour{d > 1 ? "s" : ""})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>3ème relance</Label>
                  <Select
                    value={settings.reminderDay3.toString()}
                    onValueChange={(v) =>
                      setSettings({ ...settings, reminderDay3: parseInt(v) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[10, 14, 21, 30].map((d) => (
                        <SelectItem key={d} value={d.toString()}>
                          J+{d} ({d} jour{d > 1 ? "s" : ""})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Fuseau horaire */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Globe className="h-4 w-4 text-gray-500" />
                Fuseau horaire
              </h4>
              <Select
                value={settings.timezone}
                onValueChange={(v) => setSettings({ ...settings, timezone: v })}
              >
                <SelectTrigger className="w-full md:w-80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label} ({tz.offset})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Heures de repos */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                Heures de repos
              </h4>
              <p className="text-sm text-gray-500">
                Aucune relance ne sera envoyée pendant ces heures
              </p>
              <div className="flex items-center gap-4">
                <div className="space-y-2">
                  <Label>Début</Label>
                  <Input
                    type="time"
                    value={settings.quietHoursStart}
                    onChange={(e) =>
                      setSettings({ ...settings, quietHoursStart: e.target.value })
                    }
                    className="w-32"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fin</Label>
                  <Input
                    type="time"
                    value={settings.quietHoursEnd}
                    onChange={(e) =>
                      setSettings({ ...settings, quietHoursEnd: e.target.value })
                    }
                    className="w-32"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Canaux d'envoi */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Settings className="h-4 w-4 text-gray-500" />
                Canaux d&apos;envoi
              </h4>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={settings.emailEnabled}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, emailEnabled: checked })
                    }
                  />
                  <Label className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={settings.whatsappEnabled}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, whatsappEnabled: checked })
                    }
                  />
                  <Label className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    WhatsApp
                  </Label>
                </div>
              </div>

              {settings.emailEnabled && settings.whatsappEnabled && (
                <div className="space-y-2">
                  <Label>Canal par défaut</Label>
                  <Select
                    value={settings.defaultChannel}
                    onValueChange={(v: "email" | "whatsapp" | "both") =>
                      setSettings({ ...settings, defaultChannel: v })
                    }
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email uniquement</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp uniquement</SelectItem>
                      <SelectItem value="both">Les deux canaux</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <Separator />

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-4">
              <Button
                className="bg-orange-500 hover:bg-orange-600"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Enregistrer
              </Button>

              <Button variant="outline" onClick={loadPreview} disabled={loadingPreview}>
                {loadingPreview ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Eye className="h-4 w-4 mr-2" />
                )}
                Aperçu du planning
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Aperçu des relances planifiées */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Aperçu du planning des relances</DialogTitle>
            <DialogDescription>
              Prochaines relances planifiées selon vos paramètres actuels
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            {previewDebts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Info className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucune créance en retard trouvée</p>
              </div>
            ) : (
              <div className="space-y-4">
                {previewDebts.map((debt) => (
                  <div
                    key={debt.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{debt.clientName}</span>
                        {debt.reference && (
                          <Badge variant="outline" className="text-xs">
                            {debt.reference}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatAmount(debt.amount, debt.currency)} • {debt.daysOverdue} jour{debt.daysOverdue > 1 ? "s" : ""} de retard
                      </div>
                    </div>
                    <div className="text-right">
                      {debt.nextReminder.date ? (
                        <div>
                          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                            {debt.nextReminder.type}
                          </Badge>
                          <div className="text-sm text-gray-500 mt-1">
                            {formatDate(debt.nextReminder.date)}
                          </div>
                        </div>
                      ) : debt.reminderCount >= 3 ? (
                        <Badge variant="outline" className="bg-gray-100 text-gray-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Max atteint
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-100 text-amber-700">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          À planifier
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function formatAmount(amount: number, currency: string): string {
  const formatter = new Intl.NumberFormat("fr-FR", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const symbols: Record<string, string> = {
    GNF: "FG",
    XOF: "FCFA",
    XAF: "FCFA",
    EUR: "€",
    USD: "$",
    NGN: "₦",
    GHS: "GH₵",
  };

  return formatter.format(amount) + " " + (symbols[currency] || currency);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default AutomationSettings;
