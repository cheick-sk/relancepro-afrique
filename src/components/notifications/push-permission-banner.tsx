"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, X, CheckCircle2, AlertCircle } from "lucide-react";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { toast } from "sonner";

// Helper function to check if banner was previously dismissed
function wasBannerDismissed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("push-banner-dismissed") === "true";
}

export function PushPermissionBanner() {
  const [dismissed, setDismissed] = useState(wasBannerDismissed);
  const [isAnimating, setIsAnimating] = useState(false);
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
  } = usePushNotifications();

  // Ne pas afficher si:
  // - Pas supporté
  // - Déjà subscribed
  // - Permission déjà refusée
  // - Banner fermé
  if (!isSupported || isSubscribed || permission === "denied" || dismissed) {
    return null;
  }

  const handleEnable = async () => {
    setIsAnimating(true);
    const success = await subscribe();
    setIsAnimating(false);

    if (success) {
      toast.success("Notifications activées avec succès !");
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("push-banner-dismissed", "true");
  };

  return (
    <Card className="fixed bottom-4 right-4 z-50 max-w-sm shadow-lg border-orange-200 dark:border-orange-800 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900">
            <Bell className="h-5 w-5 text-orange-600 dark:text-orange-300" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Activez les notifications
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Recevez des alertes pour vos relances et paiements en temps réel.
            </p>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                className="bg-orange-500 hover:bg-orange-600"
                onClick={handleEnable}
                disabled={isLoading || isAnimating}
              >
                {isLoading || isAnimating ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                    Activation...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Activer
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
              >
                Plus tard
              </Button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

// Version compacte pour intégrer dans les paramètres
export function PushSettingsCard() {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
    preferences,
    updatePreferences,
  } = usePushNotifications();

  if (!isSupported) {
    return (
      <Card className="bg-gray-50 dark:bg-gray-900">
        <CardContent className="p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-gray-400" />
          <div>
            <p className="font-medium text-gray-600 dark:text-gray-400">
              Notifications non supportées
            </p>
            <p className="text-sm text-gray-500">
              Votre navigateur ne supporte pas les notifications push.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${isSubscribed ? "bg-green-100 dark:bg-green-900" : "bg-gray-100 dark:bg-gray-800"}`}>
              <Bell className={`h-5 w-5 ${isSubscribed ? "text-green-600 dark:text-green-300" : "text-gray-400"}`} />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                Notifications push
              </p>
              <p className="text-sm text-gray-500">
                {permission === "denied"
                  ? "Bloquées par votre navigateur"
                  : isSubscribed
                  ? "Activées"
                  : "Non activées"}
              </p>
            </div>
          </div>
          {permission !== "denied" && (
            <Button
              size="sm"
              variant={isSubscribed ? "outline" : "default"}
              className={isSubscribed ? "" : "bg-orange-500 hover:bg-orange-600"}
              onClick={() => isSubscribed ? unsubscribe() : subscribe()}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : isSubscribed ? (
                "Désactiver"
              ) : (
                "Activer"
              )}
            </Button>
          )}
        </div>
        
        {isSubscribed && (
          <div className="mt-4 pt-4 border-t space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Préférences de notification
            </p>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={preferences.notifyReminders}
                  onChange={(e) => updatePreferences({ notifyReminders: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span>Relances</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={preferences.notifyPayments}
                  onChange={(e) => updatePreferences({ notifyPayments: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span>Paiements reçus</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={preferences.notifyAlerts}
                  onChange={(e) => updatePreferences({ notifyAlerts: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span>Alertes importantes</span>
              </label>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
