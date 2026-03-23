"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw, X, Sparkles, Download } from "lucide-react";

export function UpdateNotification() {
  const [showNotification, setShowNotification] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [registration, setRegistration] =
    useState<ServiceWorkerRegistration | null>(null);

  // Register service worker and check for updates
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker.ready.then((reg) => {
      setRegistration(reg);

      // Check for updates
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (newWorker) {
          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // New version available
              setShowNotification(true);
            }
          });
        }
      });
    });

    // Listen for controller change (after update)
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });
  }, []);

  const handleUpdate = useCallback(() => {
    if (!registration?.waiting) return;

    setIsUpdating(true);

    // Tell the waiting service worker to activate
    registration.waiting.postMessage({ type: "SKIP_WAITING" });
  }, [registration]);

  const handleDismiss = () => {
    setShowNotification(false);
  };

  if (!showNotification) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom duration-300">
      <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900 flex-shrink-0">
              <Sparkles className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                Mise à jour disponible
                <span className="px-1.5 py-0.5 text-xs bg-orange-500 text-white rounded-full">
                  Nouveau
                </span>
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                Une nouvelle version de RelancePro Africa est prête. Mettez à
                jour pour bénéficier des dernières améliorations.
              </p>

              {/* Actions */}
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={handleUpdate}
                  disabled={isUpdating}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  {isUpdating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                      Mise à jour...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-1" />
                      Mettre à jour
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDismiss}
                  className="text-gray-600 dark:text-gray-300"
                >
                  Plus tard
                </Button>
              </div>
            </div>

            {/* Close button */}
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 flex-shrink-0"
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

export default UpdateNotification;
