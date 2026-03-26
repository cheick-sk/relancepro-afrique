"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  BellOff,
  Mail,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Calendar,
  CreditCard,
  Users,
  Crown,
  Moon,
  Save,
} from "lucide-react";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { toast } from "sonner";

// Notification types with labels and icons
const NOTIFICATION_TYPES = [
  {
    id: "payment_received",
    label: "Paiement reçu",
    description: "Quand un client effectue un paiement",
    icon: CreditCard,
    defaultPush: true,
    defaultEmail: true,
    defaultWhatsapp: false,
  },
  {
    id: "reminder_sent",
    label: "Relance envoyée",
    description: "Confirmation d'envoi d'une relance",
    icon: Bell,
    defaultPush: true,
    defaultEmail: true,
    defaultWhatsapp: false,
  },
  {
    id: "debt_overdue",
    label: "Créance en retard",
    description: "Alerte quand une créance dépasse l'échéance",
    icon: AlertTriangle,
    defaultPush: true,
    defaultEmail: true,
    defaultWhatsapp: true,
  },
  {
    id: "client_responded",
    label: "Client a répondu",
    description: "Quand un client répond à une relance",
    icon: Users,
    defaultPush: true,
    defaultEmail: true,
    defaultWhatsapp: false,
  },
  {
    id: "weekly_summary",
    label: "Résumé hebdomadaire",
    description: "Bilan de vos activités chaque semaine",
    icon: Calendar,
    defaultPush: false,
    defaultEmail: true,
    defaultWhatsapp: false,
  },
  {
    id: "subscription_expiring",
    label: "Abonnement expire bientôt",
    description: "Rappel avant expiration de votre abonnement",
    icon: Crown,
    defaultPush: true,
    defaultEmail: true,
    defaultWhatsapp: false,
  },
] as const;

interface NotificationPreferencesState {
  [key: string]: {
    push: boolean;
    email: boolean;
    whatsapp: boolean;
  };
}

interface QuietHoursState {
  enabled: boolean;
  startTime: string;
  endTime: string;
}

/**
 * NotificationPreferences Component
 * Settings page for notification preferences
 */
export function NotificationPreferences() {
  const {
    isSubscribed,
    subscriptions,
    updatePreferences,
    isLoading,
    subscribe,
    permissionState,
  } = usePushNotifications();

  const [preferences, setPreferences] = useState<NotificationPreferencesState>(() => {
    const initial: NotificationPreferencesState = {};
    NOTIFICATION_TYPES.forEach((type) => {
      initial[type.id] = {
        push: type.defaultPush,
        email: type.defaultEmail,
        whatsapp: type.defaultWhatsapp,
      };
    });
    return initial;
  });

  const [quietHours, setQuietHours] = useState<QuietHoursState>({
    enabled: false,
    startTime: "22:00",
    endTime: "07:00",
  });

  const [isSaving, setIsSaving] = useState(false);

  // Load preferences from subscription
  useEffect(() => {
    if (subscriptions.length > 0) {
      const primarySub = subscriptions[0];
      setPreferences((prev) => ({
        ...prev,
        payment_received: {
          ...prev.payment_received,
          push: primarySub.notifyPayments,
        },
        reminder_sent: {
          ...prev.reminder_sent,
          push: primarySub.notifyReminders,
        },
        debt_overdue: {
          ...prev.debt_overdue,
          push: primarySub.notifyAlerts,
        },
        client_responded: {
          ...prev.client_responded,
          push: primarySub.notifyAlerts,
        },
        weekly_summary: {
          ...prev.weekly_summary,
          push: primarySub.notifyWeeklyDigest,
        },
        subscription_expiring: {
          ...prev.subscription_expiring,
          push: primarySub.notifyAlerts,
        },
      }));
      setQuietHours({
        enabled: primarySub.quietHoursEnabled,
        startTime: primarySub.quietHoursStart || "22:00",
        endTime: primarySub.quietHoursEnd || "07:00",
      });
    }
  }, [subscriptions]);

  // Toggle a specific channel for a notification type
  const togglePreference = (typeId: string, channel: "push" | "email" | "whatsapp") => {
    setPreferences((prev) => ({
      ...prev,
      [typeId]: {
        ...prev[typeId],
        [channel]: !prev[typeId][channel],
      },
    }));
  };

  // Save preferences to server
  const savePreferences = async () => {
    setIsSaving(true);

    try {
      if (subscriptions.length > 0) {
        // Update existing subscription
        const primarySub = subscriptions[0];
        await updatePreferences(primarySub.id, {
          notifyReminders: preferences.reminder_sent.push,
          notifyPayments: preferences.payment_received.push,
          notifyAlerts:
            preferences.debt_overdue.push &&
            preferences.client_responded.push &&
            preferences.subscription_expiring.push,
          notifyWeeklyDigest: preferences.weekly_summary.push,
          quietHoursEnabled: quietHours.enabled,
          quietHoursStart: quietHours.startTime,
          quietHoursEnd: quietHours.endTime,
        });
      }

      toast.success("Préférences enregistrées", {
        description: "Vos paramètres de notification ont été mis à jour.",
      });
    } catch (error) {
      toast.error("Erreur", {
        description: "Impossible d'enregistrer vos préférences.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Enable push notifications
  const handleEnablePush = async () => {
    const success = await subscribe();
    if (success) {
      toast.success("Notifications activées");
    }
  };

  return (
    <div className="space-y-6">
      {/* Push Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications push
          </CardTitle>
          <CardDescription>
            Recevez des alertes en temps réel sur vos appareils
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isSubscribed && permissionState !== "denied" && (
            <div className="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
              <div className="flex items-center gap-3">
                <BellOff className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                <div>
                  <p className="font-medium text-orange-800 dark:text-orange-200">
                    Notifications non activées
                  </p>
                  <p className="text-sm text-orange-600 dark:text-orange-400">
                    Activez les notifications pour recevoir des alertes en temps réel
                  </p>
                </div>
              </div>
              <Button
                onClick={handleEnablePush}
                disabled={isLoading}
                className="bg-orange-500 hover:bg-orange-600"
              >
                Activer
              </Button>
            </div>
          )}

          {permissionState === "denied" && (
            <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-950/30 rounded-lg">
              <div className="flex items-center gap-3">
                <BellOff className="h-5 w-5 text-red-600 dark:text-red-400" />
                <div>
                  <p className="font-medium text-red-800 dark:text-red-200">
                    Notifications bloquées
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    Autorisez les notifications dans les paramètres de votre navigateur
                  </p>
                </div>
              </div>
            </div>
          )}

          {isSubscribed && (
            <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                <div>
                  <p className="font-medium text-green-800 dark:text-green-200">
                    Notifications activées
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    {subscriptions.length} appareil{subscriptions.length > 1 ? "s" : ""} connecté{subscriptions.length > 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                Actif
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle>Types de notifications</CardTitle>
          <CardDescription>
            Choisissez comment vous souhaitez être notifié pour chaque événement
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Header row */}
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 pb-2 border-b">
            <div className="flex-1">Événement</div>
            <div className="flex gap-4">
              <div className="w-16 text-center flex items-center justify-center gap-1">
                <Bell className="h-3.5 w-3.5" />
                <span>Push</span>
              </div>
              <div className="w-16 text-center flex items-center justify-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                <span>Email</span>
              </div>
              <div className="w-16 text-center flex items-center justify-center gap-1">
                <MessageSquare className="h-3.5 w-3.5" />
                <span>WA</span>
              </div>
            </div>
          </div>

          {/* Notification types */}
          {NOTIFICATION_TYPES.map((type, index) => {
            const Icon = type.icon;
            const currentPref = preferences[type.id];

            return (
              <div key={type.id}>
                {index > 0 && <Separator className="my-3" />}
                <div className="flex items-center gap-4">
                  <div className="flex-1 flex items-start gap-3">
                    <div className="p-1.5 rounded bg-gray-100 dark:bg-gray-800">
                      <Icon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {type.label}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {type.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-16 flex justify-center">
                      <Switch
                        checked={currentPref.push}
                        onCheckedChange={() => togglePreference(type.id, "push")}
                        disabled={!isSubscribed && permissionState !== "denied"}
                      />
                    </div>
                    <div className="w-16 flex justify-center">
                      <Switch
                        checked={currentPref.email}
                        onCheckedChange={() => togglePreference(type.id, "email")}
                      />
                    </div>
                    <div className="w-16 flex justify-center">
                      <Switch
                        checked={currentPref.whatsapp}
                        onCheckedChange={() => togglePreference(type.id, "whatsapp")}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="h-5 w-5" />
            Heures calmes
          </CardTitle>
          <CardDescription>
            Désactivez temporairement les notifications push pendant certaines heures
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label htmlFor="quiet-hours-toggle">Activer les heures calmes</Label>
            </div>
            <Switch
              id="quiet-hours-toggle"
              checked={quietHours.enabled}
              onCheckedChange={(checked) =>
                setQuietHours((prev) => ({ ...prev, enabled: checked }))
              }
            />
          </div>

          {quietHours.enabled && (
            <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div className="flex-1">
                <Label htmlFor="start-time" className="text-sm text-gray-600 dark:text-gray-400">
                  De
                </Label>
                <Input
                  id="start-time"
                  type="time"
                  value={quietHours.startTime}
                  onChange={(e) =>
                    setQuietHours((prev) => ({ ...prev, startTime: e.target.value }))
                  }
                  className="mt-1"
                />
              </div>
              <div className="pt-5">à</div>
              <div className="flex-1">
                <Label htmlFor="end-time" className="text-sm text-gray-600 dark:text-gray-400">
                  À
                </Label>
                <Input
                  id="end-time"
                  type="time"
                  value={quietHours.endTime}
                  onChange={(e) =>
                    setQuietHours((prev) => ({ ...prev, endTime: e.target.value }))
                  }
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <p className="text-sm text-gray-500 dark:text-gray-400">
            Pendant les heures calmes, les notifications push sont silencieuses mais restent
            disponibles dans votre historique. Les emails et messages WhatsApp ne sont pas affectés.
          </p>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={savePreferences}
          disabled={isSaving || isLoading}
          className="gap-2"
        >
          {isSaving ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Enregistrement...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Enregistrer les préférences
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default NotificationPreferences;
