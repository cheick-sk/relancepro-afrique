"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";

interface CronStatus {
  lastRun: string | null;
  nextRun: string | null;
  status: "success" | "failed" | "pending" | "never";
  processed: number;
  sent: number;
  failed: number;
}

export function CronStatusIndicator() {
  const [status, setStatus] = useState<CronStatus>({
    lastRun: null,
    nextRun: null,
    status: "never",
    processed: 0,
    sent: 0,
    failed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);

  const fetchStatus = async () => {
    try {
      // Récupérer le statut depuis localStorage ou API
      const stored = localStorage.getItem("cron-status");
      if (stored) {
        setStatus(JSON.parse(stored));
      }
      
      // Simuler la prochaine exécution (8h du matin chaque jour)
      const now = new Date();
      const nextRun = new Date(now);
      nextRun.setHours(8, 0, 0, 0);
      if (now.getHours() >= 8) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
      
      setStatus((prev) => ({
        ...prev,
        nextRun: nextRun.toISOString(),
      }));
    } catch (error) {
      console.error("Error fetching cron status:", error);
    } finally {
      setLoading(false);
    }
  };

  const triggerCron = async () => {
    setTriggering(true);
    try {
      const response = await fetch("/api/cron/reminders", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || "dev"}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const newStatus: CronStatus = {
          lastRun: new Date().toISOString(),
          nextRun: status.nextRun,
          status: data.success ? "success" : "failed",
          processed: data.summary?.processed || 0,
          sent: data.summary?.sent || 0,
          failed: data.summary?.failed || 0,
        };
        setStatus(newStatus);
        localStorage.setItem("cron-status", JSON.stringify(newStatus));
      }
    } catch (error) {
      console.error("Error triggering cron:", error);
    } finally {
      setTriggering(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Jamais";
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateStr));
  };

  const getStatusBadge = () => {
    switch (status.status) {
      case "success":
        return (
          <Badge className="bg-green-100 text-green-700 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Actif
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200">
            <AlertCircle className="h-3 w-3 mr-1" />
            Erreur
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            En cours
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-700 border-gray-200">
            <Clock className="h-3 w-3 mr-1" />
            En attente
          </Badge>
        );
    }
  };

  if (loading) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 border-blue-200 dark:border-blue-800">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Relances Automatiques
          </span>
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-gray-500 dark:text-gray-400">Dernière exécution</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {formatDate(status.lastRun)}
            </p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Prochaine exécution</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {formatDate(status.nextRun)}
            </p>
          </div>
        </div>

        {status.lastRun && (
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-1">
              <span className="text-gray-500">Traitées:</span>
              <span className="font-medium">{status.processed}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-gray-500">Envoyées:</span>
              <span className="font-medium text-green-600">{status.sent}</span>
            </div>
            {status.failed > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-gray-500">Échouées:</span>
                <span className="font-medium text-red-600">{status.failed}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={triggerCron}
            disabled={triggering}
            className="border-blue-300 hover:bg-blue-100 dark:border-blue-700"
          >
            {triggering ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            Exécuter maintenant
          </Button>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Planifié: tous les jours à 8h00
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default CronStatusIndicator;
