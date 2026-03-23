"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Bell, 
  X, 
  CheckCircle2, 
  AlertCircle,
  CreditCard,
  Receipt,
  Send,
  Crown,
  Zap,
  Loader2
} from "lucide-react";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { toast } from "sonner";

// Helper function to check if banner was previously dismissed
function wasBannerDismissed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("push-banner-dismissed") === "true";
}

// Benefits of enabling push notifications
const PUSH_BENEFITS = [
  {
    icon: CreditCard,
    title: "Paiements en temps réel",
    description: "Soyez informé instantanément quand un client paie",
  },
  {
    icon: Send,
    title: "Relances confirmées",
    description: "Recevez la confirmation de l'envoi de vos relances",
  },
  {
    icon: Receipt,
    title: "Nouvelles créances",
    description: "Notification pour chaque nouvelle créance ajoutée",
  },
  {
    icon: Crown,
    title: "Alertes abonnement",
    description: "Rappel avant l'expiration de votre abonnement",
  },
  {
    icon: Zap,
    title: "Rapide et efficace",
    description: "Notifications instantanées sans ouvrir l'app",
  },
];

/**
 * PushPermissionBanner - Non-intrusive banner to request push notification permission
 * Shows if push is not enabled and permission is not denied
 * Can be dismissed with localStorage persistence
 */
export function PushPermissionBanner() {
  const [dismissed, setDismissed] = useState(wasBannerDismissed);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showBenefits, setShowBenefits] = useState(false);
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
  } = usePushNotifications();

  // Don't show if:
  // - Not supported
  // - Already subscribed
  // - Permission already denied
  // - Banner was dismissed
  if (!isSupported || isSubscribed || permission === "denied" || dismissed) {
    return null;
  }

  const handleEnable = async () => {
    setIsAnimating(true);
    const success = await subscribe();
    setIsAnimating(false);

    if (success) {
      toast.success("Notifications activées avec succès !");
    } else {
      toast.error("Erreur lors de l'activation des notifications");
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("push-banner-dismissed", "true");
  };

  return (
    <Card className="fixed bottom-4 right-4 z-50 max-w-md shadow-lg border-orange-200 dark:border-orange-800 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950 animate-in slide-in-from-bottom-5 duration-300">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900 shrink-0">
            <Bell className="h-5 w-5 text-orange-600 dark:text-orange-300" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Activez les notifications
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Recevez des alertes pour vos relances et paiements en temps réel.
            </p>
            
            {/* Toggle benefits */}
            {!showBenefits && (
              <button
                onClick={() => setShowBenefits(true)}
                className="text-sm text-orange-600 dark:text-orange-400 hover:underline mt-2"
              >
                Voir les avantages →
              </button>
            )}
            
            {/* Benefits list */}
            {showBenefits && (
              <div className="mt-3 space-y-2">
                {PUSH_BENEFITS.slice(0, 4).map((benefit, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <benefit.icon className="h-4 w-4 text-orange-500 shrink-0" />
                    <span>{benefit.title}</span>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                className="bg-orange-500 hover:bg-orange-600"
                onClick={handleEnable}
                disabled={isLoading || isAnimating}
              >
                {isLoading || isAnimating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
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
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 shrink-0"
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
 * PushPermissionInline - Inline version for settings page
 */
export function PushPermissionInline() {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
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

  if (permission === "denied") {
    return (
      <Card className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
        <CardContent className="p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <div>
            <p className="font-medium text-red-700 dark:text-red-300">
              Notifications bloquées
            </p>
            <p className="text-sm text-red-600 dark:text-red-400">
              Autorisez les notifications dans les paramètres de votre navigateur.
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
                {isSubscribed ? "Activées" : "Non activées"}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant={isSubscribed ? "outline" : "default"}
            className={isSubscribed ? "" : "bg-orange-500 hover:bg-orange-600"}
            onClick={() => isSubscribed ? unsubscribe() : subscribe()}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isSubscribed ? (
              "Désactiver"
            ) : (
              "Activer"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * PushPermissionCompact - Compact bell icon for header/sidebar
 */
export function PushPermissionCompact() {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  if (!isSupported || permission === "denied") {
    return null;
  }

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
      toast.success("Notifications désactivées");
    } else {
      const success = await subscribe();
      if (success) {
        toast.success("Notifications activées");
      }
    }
  };

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
