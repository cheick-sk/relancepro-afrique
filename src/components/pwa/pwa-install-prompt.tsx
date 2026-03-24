"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { usePWA } from "@/hooks/use-pwa";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Download,
  WifiOff,
  RefreshCw,
  X,
  Smartphone,
  CheckCircle,
} from "lucide-react";

// Helper function to check if prompt was dismissed
function getIsDismissed(key: string, maxHours: number): boolean {
  if (typeof window === "undefined") return false;
  const dismissedTime = localStorage.getItem(key);
  if (dismissedTime) {
    const hoursSinceDismissed =
      (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60);
    return hoursSinceDismissed < maxHours;
  }
  return false;
}

export function PWAInstallPrompt() {
  const { isInstallable, isInstalled, promptInstall } = usePWA();
  const [showPrompt, setShowPrompt] = useState(false);
  
  // Initialize dismissed state from localStorage
  const dismissedInitially = useMemo(() => getIsDismissed("pwa-prompt-dismissed", 24), []);
  const [dismissed, setDismissed] = useState(dismissedInitially);

  // Afficher le prompt après un délai
  useEffect(() => {
    if (isInstallable && !isInstalled && !dismissed) {
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [isInstallable, isInstalled, dismissed]);

  const handleInstall = async () => {
    const installed = await promptInstall();
    if (installed) {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem("pwa-prompt-dismissed", Date.now().toString());
  };

  // Ne rien afficher si déjà installé ou pas installable
  if (isInstalled || !isInstallable) {
    return null;
  }

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50">
      <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900">
              <Smartphone className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Installer l&apos;application
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                Installez RelancePro Africa pour un accès rapide et hors ligne.
              </p>
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={handleInstall}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Installer
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
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function OfflineIndicator() {
  const { isOffline } = usePWA();
  const [showReconnected, setShowReconnected] = useState(false);
  
  // Use ref to track previous offline state
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    if (isOffline) {
      wasOfflineRef.current = true;
    } else if (wasOfflineRef.current) {
      // Defer setState to avoid synchronous call in effect
      const showTimer = setTimeout(() => {
        setShowReconnected(true);
      }, 0);
      const hideTimer = setTimeout(() => {
        setShowReconnected(false);
        wasOfflineRef.current = false;
      }, 3000);
      return () => {
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [isOffline]);

  if (isOffline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[100] bg-red-500 text-white py-2 px-4 text-center text-sm font-medium">
        <div className="flex items-center justify-center gap-2">
          <WifiOff className="h-4 w-4" />
          <span>Vous êtes hors ligne. Certaines fonctionnalités peuvent être limitées.</span>
        </div>
      </div>
    );
  }

  if (showReconnected) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[100] bg-green-500 text-white py-2 px-4 text-center text-sm font-medium animate-pulse">
        <div className="flex items-center justify-center gap-2">
          <CheckCircle className="h-4 w-4" />
          <span>Connexion rétablie !</span>
        </div>
      </div>
    );
  }

  return null;
}

export function UpdateAvailableBanner() {
  const { needsUpdate, updateApp } = usePWA();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (needsUpdate) {
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [needsUpdate]);

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50">
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900">
              <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Mise à jour disponible
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Une nouvelle version est disponible.
              </p>
            </div>
            <Button
              size="sm"
              onClick={updateApp}
              className="bg-blue-500 hover:bg-blue-600"
            >
              Mettre à jour
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Composant combiné
export function PWAProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <PWAInstallPrompt />
      <OfflineIndicator />
      <UpdateAvailableBanner />
    </>
  );
}

export default PWAProvider;
