"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, X, CheckCircle2, AlertCircle, Smartphone, Clock, TrendingUp } from "lucide-react";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { toast } from "sonner";

/**
 * PushPermissionBanner
 * Shows at top of dashboard when user hasn't enabled push notifications
 * Can be dismissed and explains benefits of enabling notifications
 */
export function PushPermissionBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const {
    isSupported,
    permissionState,
    isSubscribed,
    isLoading,
    subscribe,
  } = usePushNotifications();

  // Check if banner was previously dismissed
  useEffect(() => {
    const wasDismissed = localStorage.getItem("push-banner-dismissed");
    if (wasDismissed) {
      // Show banner again after 7 days
      const dismissedAt = parseInt(wasDismissed);
      const daysSince = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) {
        setDismissed(true);
      }
    }
  }, []);

  // Don't show if:
  // - Not supported
  // - Already subscribed
  // - Permission denied
  // - Banner dismissed
  if (!isSupported || isSubscribed || permissionState === "denied" || dismissed) {
    return null;
  }

  const handleEnable = async () => {
    setIsAnimating(true);
    const success = await subscribe();
    setIsAnimating(false);

    if (success) {
      toast.success("Notifications activées !", {
        description: "Vous recevrez désormais des alertes pour vos relances et paiements.",
      });
    } else {
      toast.error("Erreur", {
        description: "Impossible d'activer les notifications. Veuillez réessayer.",
      });
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("push-banner-dismissed", Date.now().toString());
  };

  return (
    <Card className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 dark:from-orange-950/50 dark:via-amber-950/50 dark:to-orange-950/50 border-orange-200 dark:border-orange-800 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-full bg-orange-100 dark:bg-orange-900/50">
            <Bell className="h-5 w-5 text-orange-600 dark:text-orange-300" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              Activez les notifications
              <span className="text-xs bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded-full">
                Recommandé
              </span>
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Recevez des alertes en temps réel pour ne jamais manquer un paiement ou une réponse client.
            </p>
            
            {/* Benefits */}
            <div className="flex flex-wrap gap-3 mt-3">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-500">
                <Clock className="h-3.5 w-3.5" />
                <span>Alertes instantanées</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-500">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>Relances efficaces</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-500">
                <Smartphone className="h-3.5 w-3.5" />
                <span>Sur tous vos appareils</span>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex gap-2 mt-4">
              <Button
                size="sm"
                className="bg-orange-500 hover:bg-orange-600 text-white"
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
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    Activer les notifications
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="text-gray-600 dark:text-gray-400"
              >
                Plus tard
              </Button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * PushSettingsCard
 * Compact version for integration in settings page
 */
export function PushSettingsCard() {
  const {
    isSupported,
    permissionState,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribeAll,
    subscriptions,
  } = usePushNotifications();

  if (!isSupported) {
    return (
      <Card className="bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800">
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
            <div className={`p-2 rounded-full ${isSubscribed ? "bg-green-100 dark:bg-green-900/50" : "bg-gray-100 dark:bg-gray-800"}`}>
              <Bell className={`h-5 w-5 ${isSubscribed ? "text-green-600 dark:text-green-400" : "text-gray-400"}`} />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                Notifications push
              </p>
              <p className="text-sm text-gray-500">
                {permissionState === "denied"
                  ? "Bloquées par votre navigateur"
                  : isSubscribed
                  ? `${subscriptions.length} appareil${subscriptions.length > 1 ? "s" : ""} connecté${subscriptions.length > 1 ? "s" : ""}`
                  : "Non activées"}
              </p>
            </div>
          </div>
          {permissionState !== "denied" && (
            <Button
              size="sm"
              variant={isSubscribed ? "outline" : "default"}
              className={isSubscribed ? "" : "bg-orange-500 hover:bg-orange-600"}
              onClick={() => isSubscribed ? unsubscribeAll() : subscribe()}
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
        
        {permissionState === "denied" && (
          <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Les notifications sont bloquées. Pour les activer, ouvrez les paramètres de votre navigateur et autorisez les notifications pour ce site.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * PushSubscriptionList
 * Shows all devices subscribed to push notifications
 */
export function PushSubscriptionList() {
  const { subscriptions, unsubscribe, isLoading } = usePushNotifications();

  if (subscriptions.length === 0) {
    return null;
  }

  const getDeviceIcon = (deviceType: string | null) => {
    switch (deviceType) {
      case "mobile":
        return <Smartphone className="h-4 w-4" />;
      case "tablet":
        return <Smartphone className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getDeviceLabel = (deviceType: string | null, userAgent: string | null) => {
    if (deviceType === "mobile") return "Mobile";
    if (deviceType === "tablet") return "Tablette";
    
    // Try to detect browser from user agent
    if (userAgent) {
      if (userAgent.includes("Chrome")) return "Chrome";
      if (userAgent.includes("Firefox")) return "Firefox";
      if (userAgent.includes("Safari")) return "Safari";
      if (userAgent.includes("Edge")) return "Edge";
    }
    
    return "Appareil";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Appareils connectés
      </h4>
      <div className="space-y-2">
        {subscriptions.map((sub) => (
          <div
            key={sub.id}
            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded bg-gray-200 dark:bg-gray-700">
                {getDeviceIcon(sub.deviceType)}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {getDeviceLabel(sub.deviceType, sub.userAgent)}
                </p>
                <p className="text-xs text-gray-500">
                  Ajouté le {formatDate(sub.createdAt)}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => unsubscribe(sub.id)}
              disabled={isLoading}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              Supprimer
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
