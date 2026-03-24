"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePWA, useSyncStatus } from "@/hooks/use-pwa";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  WifiOff,
  Wifi,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  CloudOff,
  CloudUpload,
  X,
  ArrowUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// =====================================================
// Offline Indicator - Shows banner when offline
// =====================================================

interface OfflineIndicatorProps {
  // Position du banner
  position?: "top" | "bottom";
  // Afficher le statut de synchronisation
  showSyncStatus?: boolean;
  // Callback quand le statut change
  onStatusChange?: (isOffline: boolean) => void;
}

export function OfflineIndicator({
  position = "top",
  showSyncStatus = true,
  onStatusChange,
}: OfflineIndicatorProps) {
  const { isOffline } = usePWA();
  const syncStatus = useSyncStatus();
  const [showReconnected, setShowReconnected] = useState(false);
  
  // Use ref to track previous offline state without causing re-renders in effect
  const wasOfflineRef = useRef(false);
  
  // Notifier du changement de statut
  useEffect(() => {
    onStatusChange?.(isOffline);
  }, [isOffline, onStatusChange]);

  // Gérer l'animation de reconnexion - using setTimeout to defer setState
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

  const positionClass = position === "top" 
    ? "top-0 left-0 right-0" 
    : "bottom-0 left-0 right-0";

  return (
    <AnimatePresence>
      {/* Offline Banner */}
      {isOffline && (
        <motion.div
          initial={{ y: position === "top" ? -100 : 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: position === "top" ? -100 : 100, opacity: 0 }}
          className={`fixed ${positionClass} z-[100]`}
        >
          <div className="bg-red-500 text-white shadow-lg">
            <div className="max-w-7xl mx-auto px-4 py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <WifiOff className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Vous êtes hors ligne
                  </span>
                  {showSyncStatus && syncStatus.pendingActions.total > 0 && (
                    <Badge variant="secondary" className="ml-2 bg-white/20 text-white">
                      {syncStatus.pendingActions.total} action(s) en attente
                    </Badge>
                  )}
                </div>
                <span className="text-xs opacity-80">
                  Certaines fonctionnalités peuvent être limitées
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Reconnected Banner */}
      {!isOffline && showReconnected && (
        <motion.div
          initial={{ y: position === "top" ? -100 : 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: position === "top" ? -100 : 100, opacity: 0 }}
          className={`fixed ${positionClass} z-[100]`}
        >
          <div className="bg-green-500 text-white shadow-lg">
            <div className="max-w-7xl mx-auto px-4 py-2">
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Connexion rétablie !
                </span>
                {syncStatus.pendingActions.total > 0 && (
                  <span className="text-xs opacity-80">
                    Synchronisation en cours...
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// =====================================================
// Sync Status Indicator - Shows pending actions and sync progress
// =====================================================

export function SyncStatusIndicator({
  className,
}: {
  className?: string;
}) {
  const { isOffline, syncStatus, registerSync } = usePWA();
  const [isExpanded, setIsExpanded] = useState(false);

  const { pendingActions, isSyncing, lastSyncTime } = syncStatus;
  const hasPending = pendingActions.total > 0;

  // Ne pas afficher si en ligne et pas d'actions en attente
  if (!isOffline && !hasPending && !isSyncing) {
    return null;
  }

  const handleSync = () => {
    registerSync("sync-all");
  };

  return (
    <Card className={`border-orange-200 dark:border-orange-900 ${className}`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isOffline ? (
                <CloudOff className="h-5 w-5 text-red-500" />
              ) : isSyncing ? (
                <RefreshCw className="h-5 w-5 text-orange-500 animate-spin" />
              ) : hasPending ? (
                <CloudUpload className="h-5 w-5 text-orange-500" />
              ) : (
                <Wifi className="h-5 w-5 text-green-500" />
              )}
              <span className="font-medium text-sm">
                {isOffline
                  ? "Mode hors ligne"
                  : isSyncing
                  ? "Synchronisation..."
                  : hasPending
                  ? "Actions en attente"
                  : "En ligne"}
              </span>
            </div>

            {hasPending && !isOffline && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleSync}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <ArrowUp className="h-4 w-4 mr-1" />
                    Sync
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Pending Actions Details */}
          {hasPending && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  Actions en attente
                </span>
                <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                  {pendingActions.total}
                </Badge>
              </div>

              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full text-left text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                {isExpanded ? "Masquer les détails" : "Voir les détails"}
              </button>

              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="grid grid-cols-2 gap-2 pt-2"
                >
                  <PendingItem label="Relances" count={pendingActions.reminders} />
                  <PendingItem label="Clients" count={pendingActions.clients} />
                  <PendingItem label="Créances" count={pendingActions.debts} />
                  <PendingItem label="Autres" count={pendingActions.actions} />
                </motion.div>
              )}
            </div>
          )}

          {/* Last Sync Time */}
          {lastSyncTime && !isSyncing && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Dernière synchronisation:{" "}
              {new Date(lastSyncTime).toLocaleTimeString("fr-FR")}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PendingItem({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
      <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
      <span className="text-xs font-medium text-gray-900 dark:text-white">
        {count}
      </span>
    </div>
  );
}

// =====================================================
// Update Available Banner - Shows when SW update is available
// =====================================================

export function UpdateAvailableBanner() {
  const { updateAvailable, updateApp } = usePWA();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (updateAvailable && !dismissed) {
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [updateAvailable, dismissed]);

  const handleUpdate = () => {
    updateApp();
  };

  const handleDismiss = () => {
    setVisible(false);
    setDismissed(true);
  };

  if (!visible) {
    return null;
  }

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50"
    >
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
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleUpdate}
                className="bg-blue-500 hover:bg-blue-600"
              >
                Mettre à jour
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={handleDismiss}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// =====================================================
// Network Status Badge - Compact network status indicator
// =====================================================

export function NetworkStatusBadge({
  className,
}: {
  className?: string;
}) {
  const { isOffline } = usePWA();
  const syncStatus = useSyncStatus();

  if (isOffline) {
    return (
      <Badge
        variant="outline"
        className={`bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-900 ${className}`}
      >
        <WifiOff className="h-3 w-3 mr-1" />
        Hors ligne
      </Badge>
    );
  }

  if (syncStatus.pendingActions.total > 0) {
    return (
      <Badge
        variant="outline"
        className={`bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-900 ${className}`}
      >
        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
        {syncStatus.pendingActions.total} en attente
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={`bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-900 ${className}`}
    >
      <Wifi className="h-3 w-3 mr-1" />
      En ligne
    </Badge>
  );
}

// =====================================================
// Offline Warning - Shows a warning card for offline-only features
// =====================================================

export function OfflineWarning({
  feature,
  className,
}: {
  feature: string;
  className?: string;
}) {
  const { isOffline } = usePWA();

  if (!isOffline) {
    return null;
  }

  return (
    <Card className={`border-yellow-200 bg-yellow-50 dark:bg-yellow-950 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          <div>
            <p className="font-medium text-yellow-800 dark:text-yellow-200">
              {feature} non disponible hors ligne
            </p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              Cette fonctionnalité nécessite une connexion internet.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default OfflineIndicator;
