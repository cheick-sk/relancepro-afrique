"use client";

import { useState, useEffect, useCallback } from "react";
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
  CreditCard, 
  Receipt, 
  Send, 
  Crown, 
  AlertTriangle,
  Moon,
  Volume2, 
  VolumeX, 
  Loader2, 
  Trash2, 
  CheckCircle2,
  TestTube,
  Smartphone,
  Monitor,
  Tablet,
} from "lucide-react";
import { toast } from "sonner";

// Notification preferences interface
interface NotificationPreferences {
  pushNotificationsEnabled: boolean;
  pushDebtCreated: boolean;
  pushPaymentReceived: boolean;
  pushReminderSent: boolean;
  pushDailyDigest: boolean;
  pushRiskAlert: boolean;
  soundEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
}

// Subscription interface
interface Subscription {
  id: string;
  endpoint: string;
  deviceType: string | null;
  createdAt: string;
}

// Default preferences
const DEFAULT_PREFERENCES: NotificationPreferences = {
  pushNotificationsEnabled: false,
  pushDebtCreated: true,
  pushPaymentReceived: true,
  pushReminderSent: true,
  pushDailyDigest: false,
  pushRiskAlert: true,
  soundEnabled: true,
  quietHoursStart: "22:00",
  quietHoursEnd: "07:00",
};

/**
 * NotificationPreferences - Full notification preferences component
 * Allows users to toggle notification types and configure quiet hours
 */
export function NotificationPreferences() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);

  // Load preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const response = await fetch("/api/push/subscribe");
        if (response.ok) {
          const data = await response.json();
          setSubscriptions(data.subscriptions || []);
          setHasSubscription((data.subscriptions || []).length > 0);
          
          if (data.preferences) {
            setPreferences({
              pushNotificationsEnabled: (data.subscriptions || []).length > 0,
              pushDebtCreated: data.preferences.newDebts ?? true,
              pushPaymentReceived: data.preferences.paymentReminders ?? true,
              pushReminderSent: data.preferences.remindersSent ?? true,
              pushDailyDigest: false,
              pushRiskAlert: true,
              soundEnabled: data.preferences.soundEnabled ?? true,
              quietHoursStart: data.preferences.quietHoursStart ?? "22:00",
              quietHoursEnd: data.preferences.quietHoursEnd ?? "07:00",
            });
          }
        }
      } catch (error) {
        console.error("Error loading preferences:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, []);

  // Update a single preference
  const updatePreference = useCallback(async (key: keyof NotificationPreferences, value: boolean | string | null) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    
    setIsSaving(true);
    try {
      const response = await fetch("/api/push/subscribe", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notifyPaymentReminders: newPreferences.pushPaymentReceived,
          notifyNewDebts: newPreferences.pushDebtCreated,
          notifyRemindersSent: newPreferences.pushReminderSent,
          notifySubscription: true,
          soundEnabled: newPreferences.soundEnabled,
          quietHoursStart: newPreferences.quietHoursStart,
          quietHoursEnd: newPreferences.quietHoursEnd,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save");
      }

      toast.success("Préférences enregistrées");
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setIsSaving(false);
    }
  }, [preferences]);

  // Send test notification
  const sendTestNotification = async () => {
    setIsTesting(true);
    try {
      const response = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "debt.created",
          title: "Notification de test",
          body: "Votre configuration de notification fonctionne correctement !",
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(`Notification envoyée à ${data.sent} appareil(s)`);
      } else {
        toast.error(data.message || "Erreur lors de l'envoi");
      }
    } catch (error) {
      console.error("Error sending test notification:", error);
      toast.error("Erreur lors de l'envoi de la notification de test");
    } finally {
      setIsTesting(false);
    }
  };

  // Delete a specific subscription
  const deleteSubscription = async (endpoint: string) => {
    try {
      const response = await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete");
      }

      setSubscriptions(prev => prev.filter(s => s.endpoint !== endpoint));
      setHasSubscription(subscriptions.filter(s => s.endpoint !== endpoint).length > 0);
      toast.success("Appareil supprimé");
    } catch (error) {
      console.error("Error deleting subscription:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  // Delete all subscriptions
  const deleteAllSubscriptions = async () => {
    try {
      const response = await fetch("/api/push/unsubscribe", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete all");
      }

      setSubscriptions([]);
      setHasSubscription(false);
      setPreferences(prev => ({ ...prev, pushNotificationsEnabled: false }));
      toast.success("Toutes les notifications désactivées");
    } catch (error) {
      console.error("Error deleting all subscriptions:", error);
      toast.error("Erreur lors de la désactivation");
    }
  };

  // Get device icon
  const getDeviceIcon = (type: string | null) => {
    switch (type) {
      case "mobile":
        return <Smartphone className="h-4 w-4" />;
      case "tablet":
        return <Tablet className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enable/Disable all notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {hasSubscription ? (
              <Bell className="h-5 w-5 text-orange-500" />
            ) : (
              <BellOff className="h-5 w-5 text-gray-400" />
            )}
            Notifications push
          </CardTitle>
          <CardDescription>
            Activez ou désactivez les notifications push pour cet appareil
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${hasSubscription ? "bg-green-100 dark:bg-green-900" : "bg-gray-100 dark:bg-gray-800"}`}>
                {hasSubscription ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                ) : (
                  <BellOff className="h-5 w-5 text-gray-400" />
                )}
              </div>
              <div>
                <Label className="text-base">Notifications push</Label>
                <p className="text-sm text-gray-500">
                  {hasSubscription ? "Activées sur cet appareil" : "Non activées"}
                </p>
              </div>
            </div>
            <Switch
              checked={hasSubscription}
              onCheckedChange={(checked) => {
                if (checked) {
                  // Subscribe - this would use the hook
                  toast.info("Utilisez le bouton 'Activer' dans l'en-tête pour activer les notifications");
                } else {
                  deleteAllSubscriptions();
                }
              }}
              disabled={isSaving}
            />
          </div>

          {/* Test notification button */}
          {hasSubscription && (
            <Button
              variant="outline"
              onClick={sendTestNotification}
              disabled={isTesting}
              className="w-full"
            >
              {isTesting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <TestTube className="h-4 w-4 mr-2" />
              )}
              Envoyer une notification de test
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-orange-500" />
            Types de notifications
          </CardTitle>
          <CardDescription>
            Choisissez les types de notifications que vous souhaitez recevoir
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Nouvelles créances */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                <Receipt className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <Label className="text-base">Nouvelles créances</Label>
                <p className="text-sm text-gray-500">
                  Notification lors de l&apos;ajout d&apos;une nouvelle créance
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.pushDebtCreated}
              onCheckedChange={(checked) => updatePreference("pushDebtCreated", checked)}
              disabled={!hasSubscription || isSaving}
            />
          </div>

          <Separator />

          {/* Paiements reçus */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                <CreditCard className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <Label className="text-base">Paiements reçus</Label>
                <p className="text-sm text-gray-500">
                  Recevez une notification quand un client effectue un paiement
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.pushPaymentReceived}
              onCheckedChange={(checked) => updatePreference("pushPaymentReceived", checked)}
              disabled={!hasSubscription || isSaving}
            />
          </div>

          <Separator />

          {/* Relances envoyées */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900">
                <Send className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <Label className="text-base">Relances envoyées</Label>
                <p className="text-sm text-gray-500">
                  Confirmation quand une relance est envoyée avec succès
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.pushReminderSent}
              onCheckedChange={(checked) => updatePreference("pushReminderSent", checked)}
              disabled={!hasSubscription || isSaving}
            />
          </div>

          <Separator />

          {/* Résumé quotidien */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
                <Moon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <Label className="text-base">Résumé quotidien</Label>
                <p className="text-sm text-gray-500">
                  Recevez un récapitulatif quotidien de votre activité
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.pushDailyDigest}
              onCheckedChange={(checked) => updatePreference("pushDailyDigest", checked)}
              disabled={!hasSubscription || isSaving}
            />
          </div>

          <Separator />

          {/* Alertes de risque */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <Label className="text-base">Alertes de risque</Label>
                <p className="text-sm text-gray-500">
                  Alertes pour les paiements en retard et risques élevés
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.pushRiskAlert}
              onCheckedChange={(checked) => updatePreference("pushRiskAlert", checked)}
              disabled={!hasSubscription || isSaving}
            />
          </div>
        </CardContent>
      </Card>

      {/* Sound & Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {preferences.soundEnabled ? (
              <Volume2 className="h-5 w-5 text-orange-500" />
            ) : (
              <VolumeX className="h-5 w-5 text-gray-400" />
            )}
            Son et heures calmes
          </CardTitle>
          <CardDescription>
            Personnalisez comment vous recevez les notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Sound */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {preferences.soundEnabled ? (
                <Volume2 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              ) : (
                <VolumeX className="h-5 w-5 text-gray-400" />
              )}
              <div>
                <Label className="text-base">Son de notification</Label>
                <p className="text-sm text-gray-500">
                  Jouer un son lors de la réception d&apos;une notification
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.soundEnabled}
              onCheckedChange={(checked) => updatePreference("soundEnabled", checked)}
              disabled={!hasSubscription || isSaving}
            />
          </div>

          <Separator />

          {/* Quiet Hours */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Moon className="h-5 w-5 text-indigo-500" />
              <div>
                <Label className="text-base">Heures calmes</Label>
                <p className="text-sm text-gray-500">
                  Pas de notifications pendant ces heures
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 pl-8">
              <div className="flex items-center gap-2">
                <Label htmlFor="start" className="text-sm text-gray-500">
                  De
                </Label>
                <Input
                  id="start"
                  type="time"
                  value={preferences.quietHoursStart || "22:00"}
                  onChange={(e) => updatePreference("quietHoursStart", e.target.value)}
                  className="w-28"
                  disabled={!hasSubscription || isSaving}
                />
              </div>
              <span className="text-gray-400">à</span>
              <div className="flex items-center gap-2">
                <Label htmlFor="end" className="text-sm text-gray-500">
                  à
                </Label>
                <Input
                  id="end"
                  type="time"
                  value={preferences.quietHoursEnd || "07:00"}
                  onChange={(e) => updatePreference("quietHoursEnd", e.target.value)}
                  className="w-28"
                  disabled={!hasSubscription || isSaving}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connected Devices */}
      {hasSubscription && subscriptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Appareils connectés
            </CardTitle>
            <CardDescription>
              Gérez les appareils qui reçoivent vos notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {subscriptions.map((sub, index) => (
              <div
                key={sub.id}
                className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                    {getDeviceIcon(sub.deviceType)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white capitalize">
                      {sub.deviceType || "Appareil"} {index + 1}
                    </p>
                    <p className="text-xs text-gray-500">
                      Ajouté le {new Date(sub.createdAt).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-600 border-green-200">
                    Actif
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteSubscription(sub.endpoint)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {subscriptions.length > 1 && (
              <Button
                variant="outline"
                className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={deleteAllSubscriptions}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Désactiver toutes les notifications
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
