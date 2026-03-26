"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Clock,
  Play,
  Pause,
  RefreshCw,
  Calendar,
  Bell,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Settings,
  Zap,
  TrendingUp,
  BarChart3,
  Send,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/components/shared/status-badge";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

interface SchedulerStatus {
  isEnabled: boolean;
  pendingReminders: number;
  nextReminder: Date | null;
  remindersSentToday: number;
  remindersSentThisWeek: number;
  lastRun: Date | null;
}

interface ScheduledJob {
  id: string;
  debtId: string;
  clientName: string;
  amount: number;
  currency: string;
  scheduledAt: Date;
  reminderType: string;
  status: string;
  channel: string;
}

export default function SchedulerPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [status, setStatus] = useState<SchedulerStatus | null>(null);
  const [upcomingJobs, setUpcomingJobs] = useState<ScheduledJob[]>([]);
  const [recentJobs, setRecentJobs] = useState<ScheduledJob[]>([]);
  const [confirmTriggerOpen, setConfirmTriggerOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!session?.user) return;

    try {
      setLoading(true);
      
      // Fetch scheduler status
      const statusRes = await fetch("/api/reminders/process");
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setStatus(statusData);
      }
      
      // Fetch upcoming reminders
      const upcomingRes = await fetch("/api/debts?status=pending,partial&limit=10&sort=nextReminderAt");
      if (upcomingRes.ok) {
        const debts = await upcomingRes.json();
        const jobs: ScheduledJob[] = debts
          .filter((debt: { nextReminderAt: Date | null }) => debt.nextReminderAt)
          .slice(0, 10)
          .map((debt: {
            id: string;
            client: { name: string };
            amount: number;
            paidAmount: number;
            currency: string;
            nextReminderAt: Date | null;
            reminderCount: number;
          }) => ({
            id: debt.id,
            debtId: debt.id,
            clientName: debt.client?.name || "Client inconnu",
            amount: debt.amount - (debt.paidAmount || 0),
            currency: debt.currency,
            scheduledAt: debt.nextReminderAt!,
            reminderType: debt.reminderCount === 0 ? "first" : debt.reminderCount === 1 ? "second" : "third",
            status: "pending",
            channel: "auto",
          }));
        setUpcomingJobs(jobs);
      }
      
      // Fetch recent reminders
      const recentRes = await fetch("/api/reminders?limit=5");
      if (recentRes.ok) {
        const recentData = await recentRes.json();
        setRecentJobs(recentData.reminders || []);
      }
    } catch (error) {
      console.error("Error fetching scheduler data:", error);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggleAutoReminders = async (enabled: boolean) => {
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoRemindEnabled: enabled }),
      });

      if (response.ok) {
        setStatus(prev => prev ? { ...prev, isEnabled: enabled } : null);
        toast({
          title: enabled ? "Relances automatiques activées" : "Relances automatiques désactivées",
          description: enabled 
            ? "Les relances seront envoyées automatiquement selon vos paramètres."
            : "Les relances automatiques ont été mises en pause.",
        });
      } else {
        throw new Error("Failed to update settings");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de modifier les paramètres.",
      });
    }
  };

  const handleTriggerNow = async () => {
    setTriggering(true);
    setConfirmTriggerOpen(false);
    
    try {
      const response = await fetch("/api/reminders/process", {
        method: "POST",
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: "Traitement effectué",
          description: `${result.sent || 0} relance(s) envoyée(s), ${result.skipped || 0} ignorée(s).`,
        });
        await fetchData();
      } else {
        throw new Error(result.error || "Processing failed");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de traiter les relances.",
      });
    } finally {
      setTriggering(false);
    }
  };

  const getStatusBadge = (jobStatus: string) => {
    switch (jobStatus) {
      case "pending":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700">En attente</Badge>;
      case "sent":
        return <Badge variant="outline" className="bg-green-50 text-green-700">Envoyée</Badge>;
      case "failed":
        return <Badge variant="outline" className="bg-red-50 text-red-700">Échec</Badge>;
      case "processing":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700">En cours</Badge>;
      default:
        return <Badge variant="outline">{jobStatus}</Badge>;
    }
  };

  const getReminderTypeLabel = (type: string) => {
    switch (type) {
      case "first":
        return <Badge className="bg-blue-100 text-blue-700">1ère relance</Badge>;
      case "second":
        return <Badge className="bg-yellow-100 text-yellow-700">2ème relance</Badge>;
      case "third":
        return <Badge className="bg-red-100 text-red-700">3ème relance</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Planificateur de relances
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Gérez les relances automatiques et planifiées
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
          <Link href="/settings">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Paramètres
            </Button>
          </Link>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Statut</p>
                <p className="text-2xl font-bold mt-1">
                  {status?.isEnabled ? "Actif" : "En pause"}
                </p>
              </div>
              <div className={`p-3 rounded-full ${status?.isEnabled ? "bg-green-100" : "bg-gray-100"}`}>
                {status?.isEnabled ? (
                  <Play className="h-6 w-6 text-green-600" />
                ) : (
                  <Pause className="h-6 w-6 text-gray-600" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">En attente</p>
                <p className="text-2xl font-bold mt-1">{status?.pendingReminders || 0}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Envoyées aujourd&apos;hui</p>
                <p className="text-2xl font-bold mt-1">{status?.remindersSentToday || 0}</p>
              </div>
              <div className="p-3 rounded-full bg-orange-100">
                <Send className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Cette semaine</p>
                <p className="text-2xl font-bold mt-1">{status?.remindersSentThisWeek || 0}</p>
              </div>
              <div className="p-3 rounded-full bg-purple-100">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-orange-500" />
            Contrôles
          </CardTitle>
          <CardDescription>
            Activez ou désactivez les relances automatiques
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Switch
                id="auto-reminders"
                checked={status?.isEnabled || false}
                onCheckedChange={handleToggleAutoReminders}
              />
              <Label htmlFor="auto-reminders" className="cursor-pointer">
                <span className="font-medium">
                  {status?.isEnabled ? "Relances automatiques activées" : "Relances automatiques désactivées"}
                </span>
                <p className="text-sm text-gray-500">
                  Les relances seront envoyées selon votre planification
                </p>
              </Label>
            </div>
            
            <Button
              onClick={() => setConfirmTriggerOpen(true)}
              disabled={triggering || !status?.isEnabled}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {triggering ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Exécuter maintenant
            </Button>
          </div>
          
          {status?.lastRun && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-gray-500">
                <Calendar className="h-4 w-4 inline mr-1" />
                Dernière exécution : {formatDate(status.lastRun)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Reminders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-orange-500" />
            Prochaines relances planifiées
          </CardTitle>
          <CardDescription>
            Les {upcomingJobs.length} prochaines relances à envoyer
          </CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingJobs.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Aucune relance planifiée</p>
              <Link href="/debts">
                <Button variant="link" className="mt-2 text-orange-600">
                  Gérer les créances
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {upcomingJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{job.clientName}</p>
                      {getReminderTypeLabel(job.reminderType)}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {formatCurrency(job.amount, job.currency)}
                      </span>
                      <span className="text-sm text-gray-500">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {formatDate(job.scheduledAt)}
                      </span>
                    </div>
                  </div>
                  {getStatusBadge(job.status)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-orange-500" />
            Activité récente
          </CardTitle>
          <CardDescription>
            Les dernières relances envoyées
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentJobs.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Aucune activité récente</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {recentJobs.map((job: ScheduledJob & { client?: { name: string }; sentAt?: Date }) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    {job.status === "sent" ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : job.status === "failed" ? (
                      <XCircle className="h-5 w-5 text-red-500" />
                    ) : (
                      <Clock className="h-5 w-5 text-blue-500" />
                    )}
                    <div>
                      <p className="font-medium text-sm">{job.client?.name || job.clientName || "Client"}</p>
                      <p className="text-xs text-gray-500">
                        {job.sentAt ? formatDate(job.sentAt) : formatDate(job.scheduledAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {job.channel === "email" ? "Email" : job.channel === "whatsapp" ? "WhatsApp" : "Auto"}
                    </Badge>
                    {getStatusBadge(job.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trigger Confirmation Dialog */}
      <AlertDialog open={confirmTriggerOpen} onOpenChange={setConfirmTriggerOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exécuter les relances maintenant ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cela va déclencher l&apos;envoi de toutes les relances en attente qui sont dues.
              Les clients recevront les messages immédiatement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTriggerNow}
              className="bg-orange-500 hover:bg-orange-600"
            >
              Exécuter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
