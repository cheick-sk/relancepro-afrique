"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { WifiOff, RefreshCw, Home, Smartphone } from "lucide-react";

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = "/";
  };

  useEffect(() => {
    // Vérifier périodiquement si la connexion est rétablie
    const checkConnection = setInterval(() => {
      if (navigator.onLine) {
        window.location.reload();
      }
    }, 5000);

    return () => clearInterval(checkConnection);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-orange-200 shadow-xl">
        <CardContent className="p-8 text-center">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="p-2 rounded-lg bg-orange-500">
              <Smartphone className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              RelancePro
            </span>
            <span className="text-2xl font-light text-orange-500">Africa</span>
          </div>

          {/* Offline Icon */}
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-orange-100 dark:bg-orange-900/30">
              <WifiOff className="h-10 w-10 text-orange-500" />
            </div>
          </div>

          {/* Message */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Vous êtes hors ligne
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Pas de panique ! Vous pouvez toujours accéder à vos données en cache.
            Vérifiez votre connexion internet et réessayez.
          </p>

          {/* Features available offline */}
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 mb-6">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">
              Disponible hors ligne :
            </h2>
            <ul className="text-sm text-gray-600 dark:text-gray-300 text-left space-y-1">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                Consulter vos clients en cache
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                Voir les créances synchronisées
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                Accéder aux relances enregistrées
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                Synchronisation automatique à la reconnexion
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleRetry}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Réessayer
            </Button>
            <Button
              variant="outline"
              onClick={handleGoHome}
              className="flex-1 border-orange-200 text-orange-600 hover:bg-orange-50"
            >
              <Home className="h-4 w-4 mr-2" />
              Accueil
            </Button>
          </div>

          {/* Hint */}
          <p className="mt-6 text-xs text-gray-500 dark:text-gray-400">
            Vos données seront automatiquement synchronisées dès que la connexion sera rétablie.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
