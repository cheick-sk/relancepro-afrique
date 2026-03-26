"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Bell,
  BellOff,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Monitor,
  Tablet,
  Shield,
  Clock,
  CreditCard,
  Receipt,
  Crown,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface PushSubscription {
  id: string;
  endpoint: string;
  deviceType: string | null;
  createdAt: string;
}

interface NotificationPreferences {
  paymentReminders: boolean;
  newDebts: boolean;
  remindersSent: boolean;
  subscription: boolean;
  soundEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
}

interface PushPermissionProps {
  onSubscriptionChange?: (subscribed: boolean) => void;
}

// Check if push is supported
function isPushSupported(): boolean {
  return typeof window !== "undefined" && 
    "serviceWorker" in navigator && 
    "PushManager" in window;
}

// Get VAPID public key from server
async function getVapidPublicKey(): Promise<string | null> {
  try {
    const response = await fetch("/api/push/subscribe");
    if (response.ok) {
      const data = await response.json();
      return data.vapidPublicKey;
    }
    return null;
  } catch {
    return null;
  }
}

// Convert base64 to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Get device type
function getDeviceType(): "desktop" | "mobile" | "tablet" {
  if (typeof window === "undefined") return "desktop";
  const ua = navigator.userAgent.toLowerCase();
  if (/tablet|ipad/i.test(ua)) return "tablet";
  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) return "mobile";
  return "desktop";
}

export function PushPermission({ onSubscriptionChange }: PushPermissionProps) {
  const [isSupported] = useState(() => isPushSupported());
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [subscriptions, setSubscriptions] = useState<PushSubscription[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    paymentReminders: true,
    newDebts: true,
    remindersSent: true,
    subscription: true,
    soundEnabled: true,
    quietHoursStart: "22:00",
    quietHoursEnd: "07:00",
  });

  // Check current status on mount
  useEffect(() => {
    const checkStatus = async () => {
      if (!isSupported) return;

      // Check permission
      const currentPermission = Notification.permission;
      setPermission(currentPermission);

      // Check existing subscriptions
      if (currentPermission === "granted") {
        try {
          const response = await fetch("/api/push/subscribe");
          if (response.ok) {
            const data = await response.json();
            setSubscriptions(data.subscriptions || []);
            setIsSubscribed((data.subscriptions || []).length > 0);
            if (data.preferences) {
              setPreferences(data.preferences);
            }
          }
        } catch (error) {
          console.error("Error checking subscriptions:", error);
        }
      }
    };

    checkStatus();
  }, [isSupported]);

  // Request permission and subscribe
  const requestPermissionAndSubscribe = useCallback(async () => {
    if (!isSupported) {
      toast.error("Les notifications ne sont pas supportées par ce navigateur");
      return false;
    }

    setIsLoading(true);

    try {
      // Request permission
      const newPermission = await Notification.requestPermission();
      setPermission(newPermission);

      if (newPermission !== "granted") {
        toast.error("Permission de notification refusée");
        setIsLoading(false);
        return false;
      }

      // Get VAPID key
      const vapidPublicKey = await getVapidPublicKey();
      if (!vapidPublicKey) {
        toast.error("Impossible de récupérer la configuration");
        setIsLoading(false);
        return false;
      }

      // Register service worker and subscribe
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }

      // Save subscription to server
      const subscriptionJson = subscription.toJSON();
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subscriptionJson.endpoint,
          p256dh: subscriptionJson.keys?.p256dh,
          auth: subscriptionJson.keys?.auth,
          userAgent: navigator.userAgent,
          deviceType: getDeviceType(),
          ...preferences,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save subscription");
      }

      // Refresh subscriptions list
      const dataResponse = await fetch("/api/push/subscribe");
      if (dataResponse.ok) {
        const data = await dataResponse.json();
        setSubscriptions(data.subscriptions || []);
      }

      setIsSubscribed(true);
      toast.success("Notifications activées avec succès !");
      onSubscriptionChange?.(true);
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error("Error subscribing:", error);
      toast.error("Erreur lors de l'activation des notifications");
      setIsLoading(false);
      return false;
    }
  }, [isSupported, preferences, onSubscriptionChange]);

  // Unsubscribe
  const unsubscribe = useCallback(async () => {
    setIsLoading(true);

    try {
      // Unsubscribe from browser
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
      }

      // Remove from server
      await fetch("/api/push/unsubscribe", { method: "DELETE" });

      setIsSubscribed(false);
      setSubscriptions([]);
      toast.success("Notifications désactivées");
      onSubscriptionChange?.(false);
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error("Error unsubscribing:", error);
      toast.error("Erreur lors de la désactivation");
      setIsLoading(false);
      return false;
    }
  }, [onSubscriptionChange]);

  // Update preferences
  const updatePreferences = useCallback(async (newPreferences: Partial<NotificationPreferences>) => {
    const updated = { ...preferences, ...newPreferences };
    setPreferences(updated);

    try {
      await fetch("/api/push/subscribe", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notifyPaymentReminders: updated.paymentReminders,
          notifyNewDebts: updated.newDebts,
          notifyRemindersSent: updated.remindersSent,
          notifySubscription: updated.subscription,
          soundEnabled: updated.soundEnabled,
          quietHoursStart: updated.quietHoursStart,
          quietHoursEnd: updated.quietHoursEnd,
        }),
      });
      toast.success("Préférences mises à jour");
    } catch (error) {
      console.error("Error updating preferences:", error);
      toast.error("Erreur lors de la mise à jour");
    }
  }, [preferences]);

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

  if (!isSupported) {
    return (
      <Card className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-800">
              <BellOff className="h-6 w-6 text-gray-400" />
            </div>
            <div>
              <p className="font-medium text-gray-600 dark:text-gray-400">
                Notifications non supportées
              </p>
              <p className="text-sm text-gray-500">
                Votre navigateur ne supporte pas les notifications push.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-orange-500" />
          Notifications push
        </CardTitle>
        <CardDescription>
          Recevez des alertes en temps réel pour vos relances et paiements
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status indicator */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${
              permission === "granted" && isSubscribed
                ? "bg-green-100 dark:bg-green-900"
                : permission === "denied"
                ? "bg-red-100 dark:bg-red-900"
                : "bg-gray-100 dark:bg-gray-800"
            }`}>
              {permission === "granted" && isSubscribed ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              ) : permission === "denied" ? (
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              ) : (
                <Bell className="h-5 w-5 text-gray-400" />
              )}
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {permission === "denied"
                  ? "Notifications bloquées"
                  : isSubscribed
                  ? "Notifications activées"
                  : "Notifications non activées"}
              </p>
              <p className="text-sm text-gray-500">
                {permission === "denied"
                  ? "Autorisez les notifications dans les paramètres de votre navigateur"
                  : isSubscribed
                  ? `${subscriptions.length} appareil${subscriptions.length > 1 ? "s" : ""} connecté${subscriptions.length > 1 ? "s" : ""}`
                  : "Activez pour recevoir des alertes en temps réel"}
              </p>
            </div>
          </div>
          
          {permission !== "denied" && (
            <Button
              onClick={() => isSubscribed ? unsubscribe() : requestPermissionAndSubscribe()}
              disabled={isLoading}
              variant={isSubscribed ? "outline" : "default"}
              className={isSubscribed ? "" : "bg-orange-500 hover:bg-orange-600"}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {isSubscribed ? "Désactiver" : "Activer"}
            </Button>
          )}
        </div>

        {/* Connected devices */}
        {isSubscribed && subscriptions.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Appareils connectés
            </h4>
            <div className="space-y-2">
              {subscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center gap-3">
                    {getDeviceIcon(sub.deviceType)}
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                        {sub.deviceType || "Appareil"}
                      </p>
                      <p className="text-xs text-gray-500">
                        Ajouté le {new Date(sub.createdAt).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Actif
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notification preferences */}
        {isSubscribed && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Types de notifications
            </h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Rappels de paiement
                    </p>
                    <p className="text-xs text-gray-500">
                      Paiements reçus et confirmés
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.paymentReminders}
                  onCheckedChange={(checked) => 
                    updatePreferences({ paymentReminders: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <Receipt className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Nouvelles créances
                    </p>
                    <p className="text-xs text-gray-500">
                      Nouvelles dettes ajoutées au système
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.newDebts}
                  onCheckedChange={(checked) => 
                    updatePreferences({ newDebts: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Relances envoyées
                    </p>
                    <p className="text-xs text-gray-500">
                      Confirmation d&apos;envoi de relances
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.remindersSent}
                  onCheckedChange={(checked) => 
                    updatePreferences({ remindersSent: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <Crown className="h-5 w-5 text-amber-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Abonnement
                    </p>
                    <p className="text-xs text-gray-500">
                      Expiration et renouvellement
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.subscription}
                  onCheckedChange={(checked) => 
                    updatePreferences({ subscription: checked })
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* Sound and quiet hours */}
        {isSubscribed && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Paramètres avancés
            </h4>

            <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Son de notification
                  </p>
                  <p className="text-xs text-gray-500">
                    Jouer un son lors des notifications
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences.soundEnabled}
                onCheckedChange={(checked) => 
                  updatePreferences({ soundEnabled: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-indigo-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Heures calmes
                  </p>
                  <p className="text-xs text-gray-500">
                    Pas de notifications entre {preferences.quietHoursStart} et {preferences.quietHoursEnd}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  type="time"
                  value={preferences.quietHoursStart || "22:00"}
                  onChange={(e) => updatePreferences({ quietHoursStart: e.target.value })}
                  className="px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-600"
                />
                <span className="text-gray-500 self-center">à</span>
                <input
                  type="time"
                  value={preferences.quietHoursEnd || "07:00"}
                  onChange={(e) => updatePreferences({ quietHoursEnd: e.target.value })}
                  className="px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-600"
                />
              </div>
            </div>
          </div>
        )}

        {/* Benefits list */}
        {!isSubscribed && permission !== "denied" && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Avantages des notifications
            </h4>
            <ul className="space-y-2">
              {[
                { icon: Clock, text: "Alertes en temps réel pour les paiements" },
                { icon: Bell, text: "Confirmation d&apos;envoi des relances" },
                { icon: Crown, text: "Rappel avant expiration d&apos;abonnement" },
                { icon: Smartphone, text: "Fonctionne sur mobile et desktop" },
              ].map((item, index) => (
                <li key={index} className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                  <item.icon className="h-4 w-4 text-orange-500" />
                  {item.text}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Compact version for header/bell icon
export function PushPermissionCompact() {
  const [isSupported] = useState(() => isPushSupported());
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      if (!isSupported) return;
      setPermission(Notification.permission);
      
      if (Notification.permission === "granted") {
        try {
          const response = await fetch("/api/push/subscribe");
          if (response.ok) {
            const data = await response.json();
            setIsSubscribed((data.subscriptions || []).length > 0);
          }
        } catch {
          // ignore
        }
      }
    };
    checkStatus();
  }, [isSupported]);

  const handleToggle = async () => {
    if (!isSupported) {
      toast.error("Notifications non supportées");
      return;
    }

    setIsLoading(true);

    if (isSubscribed) {
      // Unsubscribe
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
        }
        await fetch("/api/push/unsubscribe", { method: "DELETE" });
        setIsSubscribed(false);
        toast.success("Notifications désactivées");
      } catch {
        toast.error("Erreur lors de la désactivation");
      }
    } else {
      // Subscribe
      try {
        const newPermission = await Notification.requestPermission();
        setPermission(newPermission);
        
        if (newPermission !== "granted") {
          toast.error("Permission refusée");
          setIsLoading(false);
          return;
        }

        const response = await fetch("/api/push/subscribe");
        const data = await response.json();
        
        const registration = await navigator.serviceWorker.ready;
        let subscription = await registration.pushManager.getSubscription();
        
        if (!subscription && data.vapidPublicKey) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(data.vapidPublicKey),
          });
        }

        if (subscription) {
          const subJson = subscription.toJSON();
          await fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              endpoint: subJson.endpoint,
              p256dh: subJson.keys?.p256dh,
              auth: subJson.keys?.auth,
              userAgent: navigator.userAgent,
              deviceType: getDeviceType(),
            }),
          });
        }

        setIsSubscribed(true);
        toast.success("Notifications activées");
      } catch {
        toast.error("Erreur lors de l'activation");
      }
    }

    setIsLoading(false);
  };

  if (!isSupported || permission === "denied") {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      disabled={isLoading}
      className="relative"
      title={isSubscribed ? "Désactiver les notifications" : "Activer les notifications"}
    >
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <Bell className={`h-5 w-5 ${isSubscribed ? "text-orange-500" : ""}`} />
      )}
      {isSubscribed && (
        <span className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900" />
      )}
    </Button>
  );
}
