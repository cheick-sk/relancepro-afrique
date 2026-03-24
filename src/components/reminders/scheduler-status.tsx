"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Play,
  Pause,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Settings,
  Calendar,
  Zap,
} from "lucide-react";
import { formatDate } from "@/components/shared/status-badge";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

interface SchedulerStatus {
  isEnabled: boolean;
  pendingReminders: number;
  nextReminder: Date | null;
  remindersSentToday: number;
  lastRun: Date | null;
}

export function SchedulerStatus() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SchedulerStatus | null>(null);
  const [toggling, setToggling] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!session?.user) return;

    try {
      const response = await fetch("/api/reminders/process");
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error("Error fetching scheduler status:", error);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchStatus();
    // Refresh every minute
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleToggle = async (enabled: boolean) => {
    setToggling(true);
    
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoRemindEnabled: enabled }),
      });

      if (response.ok) {
        setStatus(prev => prev ? { ...prev, isEnabled: enabled } : null);
        toast({
          title: enabled ? "Activé" : "Désactivé",
          description: enabled 
            ? "Les relances automatiques sont actives"
            : "Les relances automatiques sont en pause",
        });
      } else {
        throw new Error("Failed to update");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de modifier le statut",
      });
    } finally {
      setToggling(false);
    }
  };

  const handleTriggerNow = async () => {
    try {
      const response = await fetch("/api/reminders/process", {
        method: "POST",
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: "Traitement effectué",
          description: `${result.sent || 0} relance(s) envoyée(s)`,
        });
        await fetchStatus();
        setOpen(false);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de traiter les relances",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800">
        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        <span className="text-sm text-gray-500">Chargement...</span>
      </div>
    );
  }

  const isActive = status?.isEnabled ?? true;
  const pendingCount = status?.pendingReminders ?? 0;
  const nextRun = status?.nextReminder ? new Date(status.nextReminder) : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`gap-2 ${isActive ? "border-green-300 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:border-green-800" : "border-gray-300 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800"}`}
        >
          {isActive ? (
            <Play className="h-4 w-4 text-green-600" />
          ) : (
            <Pause className="h-4 w-4 text-gray-500" />
          )}
          <span className="hidden sm:inline">
            {isActive ? "Auto-reminders ON" : "En pause"}
          </span>
          {pendingCount > 0 && (
            <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-medium rounded-full bg-orange-100 text-orange-700">
              {pendingCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          {/* Status Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className={`h-5 w-5 ${isActive ? "text-green-500" : "text-gray-400"}`} />
              <span className="font-semibold">
                {isActive ? "Relances actives" : "Relances en pause"}
              </span>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={handleToggle}
              disabled={toggling}
            />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <p className="text-xs text-gray-500">En attente</p>
              <p className="text-lg font-semibold">{pendingCount}</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <p className="text-xs text-gray-500">Aujourd&apos;hui</p>
              <p className="text-lg font-semibold">{status?.remindersSentToday || 0}</p>
            </div>
          </div>

          {/* Next Run */}
          {nextRun && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <Calendar className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-xs text-blue-600">Prochaine relance</p>
                <p className="text-sm font-medium">{formatDate(nextRun)}</p>
              </div>
            </div>
          )}

          {/* No Scheduled Reminders Warning */}
          {!nextRun && pendingCount === 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <div>
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Aucune relance planifiée
                </p>
              </div>
            </div>
          )}

          {/* Last Run */}
          {status?.lastRun && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>
                Dernière exécution : {formatDate(status.lastRun)}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={handleTriggerNow}
              disabled={!isActive}
            >
              <Play className="h-4 w-4 mr-1" />
              Exécuter
            </Button>
            <Link href="/scheduler" className="flex-1">
              <Button size="sm" variant="outline" className="w-full">
                <Settings className="h-4 w-4 mr-1" />
                Paramètres
              </Button>
            </Link>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
