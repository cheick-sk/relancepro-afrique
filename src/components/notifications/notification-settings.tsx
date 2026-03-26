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
  Volume2,
  VolumeX,
  Moon,
  CheckCircle2,
  Loader2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

interface NotificationPreferences {
  paymentReminders: boolean;
  newDebts: boolean;
  remindersSent: boolean;
  subscription: boolean;
  soundEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
}

interface Subscription {
  id: string;
  endpoint: string;
  deviceType: string | null;
  userAgent: string | null;
  createdAt: string;
  notifyPaymentReminders: boolean;
  notifyNewDebts: boolean;
  notifyRemindersSent: boolean;
  notifySubscription: boolean;
  soundEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
}

export function NotificationSettings() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    paymentReminders: true,
    newDebts: true,
    remindersSent: true,
    subscription: true,
    soundEnabled: true,
    quietHoursStart: "22:00",
    quietHoursEnd: "07:00",
  });

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
            setPreferences(data.preferences);
          } else if ((data.subscriptions || []).length > 0) {
            // Use first subscription's preferences as default
            const sub = data.subscriptions[0];
            setPreferences({
              paymentReminders: sub.notifyPaymentReminders,
              newDebts: sub.notifyNewDebts,
              remindersSent: sub.notifyRemindersSent,
              subscription: sub.notifySubscription,
              soundEnabled: sub.soundEnabled,
              quietHoursStart: sub.quietHoursStart,
              quietHoursEnd: sub.quietHoursEnd,
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
          notifyPaymentReminders: newPreferences.paymentReminders,
          notifyNewDebts: newPreferences.newDebts,
          notifyRemindersSent: newPreferences.remindersSent,
          notifySubscription: newPreferences.subscription,
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
      // Revert on error
      setPreferences(preferences);
    } finally {
      setIsSaving(false);
    }
  }, [preferences]);

  // Delete a specific subscription
  const deleteSubscription = useCallback(async (endpoint: string) => {
    try {
      const response = await fetch(`/api/push/unsubscribe`, {
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
  }, [subscriptions]);

  // Delete all subscriptions
  const deleteAllSubscriptions = useCallback(async () => {
    try {
      const response = await fetch("/api/push/unsubscribe", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete all");
      }

      setSubscriptions([]);
      setHasSubscription(false);
      toast.success("Toutes les notifications désactivées");
    } catch (error) {
      console.error("Error deleting all subscriptions:", error);
      toast.error("Erreur lors de la désactivation");
    }
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
        </CardContent>
      </Card>
    );
  }

  if (!hasSubscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5 text-gray-400" />
            Notifications push
          </CardTitle>
          <CardDescription>
            Vous n&apos;avez pas encore activé les notifications push
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Activez les notifications pour recevoir des alertes en temps réel sur vos relances, paiements et abonnement.
          </p>
          <Button asChild className="bg-orange-500 hover:bg-orange-600">
            <a href="/settings#notifications">
              <Bell className="h-4 w-4 mr-2" />
              Activer les notifications
            </a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
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
          {/* Rappels de paiement */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                <CreditCard className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <Label className="text-base">Rappels de paiement</Label>
                <p className="text-sm text-gray-500">
                  Recevez une notification quand un client effectue un paiement
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.paymentReminders}
              onCheckedChange={(checked) => updatePreference("paymentReminders", checked)}
              disabled={isSaving}
            />
          </div>

          <Separator />

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
              checked={preferences.newDebts}
              onCheckedChange={(checked) => updatePreference("newDebts", checked)}
              disabled={isSaving}
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
              checked={preferences.remindersSent}
              onCheckedChange={(checked) => updatePreference("remindersSent", checked)}
              disabled={isSaving}
            />
          </div>

          <Separator />

          {/* Abonnement */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900">
                <Crown className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <Label className="text-base">Abonnement</Label>
                <p className="text-sm text-gray-500">
                  Alerte avant expiration de votre abonnement
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.subscription}
              onCheckedChange={(checked) => updatePreference("subscription", checked)}
              disabled={isSaving}
            />
          </div>
        </CardContent>
      </Card>

      {/* Sound & Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-orange-500" />
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
              disabled={isSaving}
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
                  disabled={isSaving}
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
                  disabled={isSaving}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connected Devices */}
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
                  {sub.deviceType === "mobile" ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  ) : sub.deviceType === "tablet" ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  )}
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
    </div>
  );
}
