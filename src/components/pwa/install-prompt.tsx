"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Download,
  X,
  Smartphone,
  Wifi,
  Bell,
  Zap,
  Shield,
  CheckCircle,
} from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const INSTALL_BENEFITS = [
  {
    icon: Wifi,
    title: "Accès hors ligne",
    description: "Consultez vos données même sans connexion internet",
  },
  {
    icon: Zap,
    title: "Démarrage rapide",
    description:
      "Accédez à RelancePro en un clic depuis votre écran d'accueil",
  },
  {
    icon: Bell,
    title: "Notifications push",
    description: "Recevez des alertes pour vos relances importantes",
  },
  {
    icon: Shield,
    title: "Données sécurisées",
    description: "Vos données sont synchronisées automatiquement",
  },
];

// Helper function to check if app is installed
function getIsInstalled(): boolean {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone ===
      true
  );
}

// Helper function to check if prompt was recently dismissed
function wasRecentlyDismissed(): boolean {
  if (typeof window === "undefined") return false;

  const dismissedTime = localStorage.getItem("pwa-install-dismissed");
  if (dismissedTime) {
    const hoursSinceDismissed =
      (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60);
    return hoursSinceDismissed < 24;
  }
  return false;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isInstalled, setIsInstalled] = useState(getIsInstalled);
  const [wasDismissed] = useState(wasRecentlyDismissed);

  // Listen for install prompt
  useEffect(() => {
    if (typeof window === "undefined" || wasDismissed) return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);

      // Show prompt after delay
      setTimeout(() => {
        setShowPrompt(true);
      }, 5000);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
      setShowPrompt(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [wasDismissed]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    setIsInstalling(true);

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        setShowPrompt(false);
        setIsInstalled(true);
      }

      setDeferredPrompt(null);
    } catch (error) {
      console.error("Install error:", error);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  };

  // Don't show if already installed, recently dismissed, or no prompt available
  if (isInstalled || wasDismissed || !showPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <Card className="max-w-md w-full border-orange-200 bg-white dark:bg-gray-900 shadow-2xl animate-in fade-in zoom-in duration-300">
        <CardContent className="p-0">
          {/* Header */}
          <div className="relative bg-gradient-to-r from-orange-500 to-amber-500 p-6 rounded-t-lg">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 text-white/80 hover:text-white hover:bg-white/20"
              onClick={handleDismiss}
            >
              <X className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-white/20">
                <Smartphone className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  Installer l&apos;application
                </h2>
                <p className="text-white/80 text-sm">
                  RelancePro Africa sur votre appareil
                </p>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="p-6">
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Installez RelancePro Africa pour une meilleure expérience :
            </p>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {INSTALL_BENEFITS.map((benefit, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20"
                >
                  <benefit.icon className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-sm text-gray-900 dark:text-white">
                      {benefit.title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                onClick={handleInstall}
                disabled={isInstalling}
              >
                {isInstalling ? (
                  <>
                    <Download className="h-4 w-4 mr-2 animate-bounce" />
                    Installation...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Installer
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                className="border-gray-200"
                onClick={handleDismiss}
              >
                Plus tard
              </Button>
            </div>

            {/* Trust indicator */}
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <CheckCircle className="h-3 w-3" />
              <span>Installation gratuite et sécurisée</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default InstallPrompt;
