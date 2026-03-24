"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { usePWA } from "@/hooks/use-pwa";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  RefreshCw,
  Download,
  X,
  Sparkles,
  Clock,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Helper function to check if notification was dismissed
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

// =====================================================
// Update Notification - Shows when new SW version available
// =====================================================

interface UpdateNotificationProps {
  // Callback when update is applied
  onUpdate?: () => void;
  // Callback when notification is dismissed
  onDismiss?: () => void;
  // Auto show delay in ms
  delay?: number;
  // Show as modal sheet instead of banner
  asModal?: boolean;
}

export function UpdateNotification({
  onUpdate,
  onDismiss,
  delay = 1000,
  asModal = false,
}: UpdateNotificationProps) {
  const { updateAvailable, needsUpdate, updateApp } = usePWA();
  const [visible, setVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Initialize dismissed state from localStorage
  const dismissedInitially = useMemo(
    () => getIsDismissed("pwa-update-dismissed", 1), // Dismiss for 1 hour
    []
  );
  const [dismissed, setDismissed] = useState(dismissedInitially);

  // Show notification when update is available
  useEffect(() => {
    if ((updateAvailable || needsUpdate) && !dismissed) {
      const timer = setTimeout(() => setVisible(true), delay);
      return () => clearTimeout(timer);
    }
  }, [updateAvailable, needsUpdate, dismissed, delay]);

  const handleUpdate = useCallback(async () => {
    setIsUpdating(true);
    try {
      updateApp();
      onUpdate?.();
    } finally {
      // The page will reload, so this may not be reached
      setIsUpdating(false);
    }
  }, [updateApp, onUpdate]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    setDismissed(true);
    localStorage.setItem("pwa-update-dismissed", Date.now().toString());
    onDismiss?.();
  }, [onDismiss]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        handleDismiss();
      }
      setVisible(open);
    },
    [handleDismiss]
  );

  // Don't render if no update or dismissed
  if (!updateAvailable && !needsUpdate) {
    return null;
  }

  // Modal variant
  if (asModal) {
    return (
      <Sheet open={visible} onOpenChange={handleOpenChange}>
        <SheetContent side="bottom" className="h-auto rounded-t-2xl">
          <SheetHeader className="text-left pb-2">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg">
                <Sparkles className="h-7 w-7 text-white" />
              </div>
              <div>
                <SheetTitle className="text-xl">
                  Mise à jour disponible
                </SheetTitle>
                <SheetDescription className="text-sm">
                  Une nouvelle version de RelancePro est prête
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="py-4 space-y-4">
            {/* Update features */}
            <div className="space-y-2">
              <UpdateFeature
                icon={Sparkles}
                text="Nouvelles fonctionnalités"
              />
              <UpdateFeature icon={CheckCircle} text="Corrections de bugs" />
              <UpdateFeature icon={AlertTriangle} text="Améliorations de sécurité" />
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                size="lg"
                className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white"
                onClick={handleUpdate}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <>
                    <div className="h-5 w-5 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Mise à jour...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-5 w-5 mr-2" />
                    Mettre à jour maintenant
                  </>
                )}
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="sm:w-auto"
                onClick={handleDismiss}
              >
                Plus tard
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              La mise à jour sera appliquée au prochain rechargement
            </p>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Banner variant (default)
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50"
        >
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900">
                  <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Mise à jour disponible
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    Une nouvelle version de l&apos;application est disponible.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      onClick={handleUpdate}
                      disabled={isUpdating}
                      className="bg-blue-500 hover:bg-blue-600"
                    >
                      {isUpdating ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Mettre à jour
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function UpdateFeature({
  icon: Icon,
  text,
}: {
  icon: React.ElementType;
  text: string;
}) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg bg-blue-50/50 dark:bg-blue-900/20">
      <Icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      <span className="text-sm text-gray-700 dark:text-gray-300">{text}</span>
    </div>
  );
}

// =====================================================
// Compact Update Badge - For header/sidebar
// =====================================================

export function UpdateBadge({
  className,
  onClick,
}: {
  className?: string;
  onClick?: () => void;
}) {
  const { updateAvailable, needsUpdate, updateApp } = usePWA();
  const [isUpdating, setIsUpdating] = useState(false);

  if (!updateAvailable && !needsUpdate) {
    return null;
  }

  const handleClick = async () => {
    if (onClick) {
      onClick();
    } else {
      setIsUpdating(true);
      updateApp();
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      className={`bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900 ${className}`}
      onClick={handleClick}
      disabled={isUpdating}
    >
      {isUpdating ? (
        <RefreshCw className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <Download className="h-4 w-4 mr-1" />
          Mise à jour
        </>
      )}
    </Button>
  );
}

// =====================================================
// Update Card - For settings page
// =====================================================

export function UpdateCard() {
  const { updateAvailable, needsUpdate, updateApp } = usePWA();
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const handleUpdate = async () => {
    setIsUpdating(true);
    updateApp();
  };

  const handleCheckUpdate = () => {
    // Force check for updates
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration().then((registration) => {
        registration?.update();
        setLastChecked(new Date());
      });
    }
  };

  return (
    <Card className="border-blue-200 dark:border-blue-900">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
            <RefreshCw className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
              Mises à jour
            </h3>
            {updateAvailable || needsUpdate ? (
              <>
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                  Une nouvelle version est disponible !
                </p>
                <Button
                  size="sm"
                  className="mt-3 bg-blue-500 hover:bg-blue-600"
                  onClick={handleUpdate}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <>
                      <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Mise à jour...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Mettre à jour maintenant
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  L&apos;application est à jour.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={handleCheckUpdate}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Vérifier les mises à jour
                </Button>
                {lastChecked && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Dernière vérification : {lastChecked.toLocaleTimeString("fr-FR")}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default UpdateNotification;
