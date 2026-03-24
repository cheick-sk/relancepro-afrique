"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  WifiOff,
  RefreshCw,
  Home,
  ArrowLeft,
  CloudOff,
  Shield,
  Smartphone,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";

// Helper function for lazy initialization
function getIsOnline(): boolean {
  if (typeof window === "undefined") return false;
  return navigator.onLine;
}

export default function OfflinePage() {
  const [isRetrying, setIsRetrying] = useState(false);
  const [isOnline, setIsOnline] = useState(getIsOnline);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Update state on mount (deferred to avoid synchronous setState in effect)
    const timer = setTimeout(() => {
      setIsOnline(navigator.onLine);
    }, 0);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleRetry = () => {
    setIsRetrying(true);
    setTimeout(() => {
      if (navigator.onLine) {
        window.location.href = "/dashboard";
      } else {
        setIsRetrying(false);
      }
    }, 1000);
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "/";
    }
  };

  // If back online, redirect to dashboard
  useEffect(() => {
    if (isOnline) {
      const timer = setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        <Card className="border-0 shadow-2xl overflow-hidden">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-8 text-white text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm mb-4"
            >
              <WifiOff className="h-12 w-12" />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-bold mb-2"
            >
              Vous êtes hors ligne
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-white/80"
            >
              Vérifiez votre connexion internet et réessayez
            </motion.p>
          </div>

          <CardContent className="p-6 space-y-6">
            {/* Online status indicator */}
            {isOnline && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-900 rounded-lg p-4 text-center"
              >
                <p className="text-green-700 dark:text-green-400 font-medium">
                  Connexion rétablie ! Redirection en cours...
                </p>
              </motion.div>
            )}

            {/* Features available offline */}
            <div className="space-y-3">
              <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <CloudOff className="h-5 w-5 text-orange-500" />
                Fonctionnalités disponibles hors ligne
              </h2>
              <div className="grid grid-cols-1 gap-2">
                <FeatureItem
                  icon={Smartphone}
                  title="Données en cache"
                  description="Vos données récentes sont accessibles"
                />
                <FeatureItem
                  icon={Shield}
                  title="Actions sauvegardées"
                  description="Vos modifications seront synchronisées"
                />
                <FeatureItem
                  icon={Zap}
                  title="Mode hors ligne"
                  description="Continuez à travailler normalement"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
                onClick={handleRetry}
                disabled={isRetrying || isOnline}
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                    Reconnexion...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-5 w-5 mr-2" />
                    Réessayer
                  </>
                )}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="flex-1"
                onClick={handleGoBack}
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Retour
              </Button>
            </div>

            {/* Home link */}
            <div className="text-center pt-2">
              <Button
                variant="ghost"
                className="text-orange-600 dark:text-orange-400"
                onClick={() => (window.location.href = "/")}
              >
                <Home className="h-4 w-4 mr-2" />
                Retour à l&apos;accueil
              </Button>
            </div>

            {/* Help text */}
            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              RelancePro Africa fonctionne en mode hors ligne. Vos données seront
              automatiquement synchronisées dès que la connexion sera rétablie.
            </p>
          </CardContent>
        </Card>

        {/* App branding */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center mt-6 text-gray-500 dark:text-gray-400"
        >
          <p className="text-sm font-medium">RelancePro Africa</p>
          <p className="text-xs">Automatisez vos relances clients</p>
        </motion.div>
      </motion.div>
    </div>
  );
}

function FeatureItem({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
      <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
        <Icon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
      </div>
      <div>
        <p className="font-medium text-sm text-gray-900 dark:text-white">
          {title}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      </div>
    </div>
  );
}
