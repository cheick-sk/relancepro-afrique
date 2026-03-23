"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Bell,
  Clock,
  Calendar,
  Settings,
  RefreshCw,
  Check,
  X,
  AlertCircle,
  Loader2,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

// =====================================================
// TYPES
// =====================================================

interface ReminderSettings {
  autoRemindEnabled: boolean;
  reminderDay1: number;
  reminderDay2: number;
  reminderDay3: number;
  emailNotificationsEnabled: boolean;
  soundNotificationsEnabled: boolean;
}

interface QueueStats {
  pending: number;
  processing: number;
  sent: number;
  failed: number;
  cancelled: number;
  total: number;
}

interface QueueItem {
  id: string;
  debtId: string;
  scheduledAt: string;
  reminderType: "first" | "second" | "third";
  channel: "email" | "whatsapp" | "both";
  status: "pending" | "processing" | "sent" | "failed" | "cancelled";
  attempts: number;
  maxAttempts: number;
  priority: number;
  createdAt: string;
}

interface RateLimitStatus {
  count: number;
  limit: number;
  remaining: number;
  resetAt: string;
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function RemindersSettingsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [settings, setSettings] = useState<ReminderSettings>({
    autoRemindEnabled: true,
    reminderDay1: 3,
    reminderDay2: 7,
    reminderDay3: 14,
    emailNotificationsEnabled: true,
    soundNotificationsEnabled: true,
  });
  const [queueStats, setQueueStats] = useState<QueueStats>({
    pending: 0,
    processing: 0,
    sent: 0,
    failed: 0,
    cancelled: 0,
    total: 0,
  });
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [rateLimitStatus, setRateLimitStatus] = useState<RateLimitStatus>({
    count: 0,
    limit: 100,
    remaining: 100,
    resetAt: new Date().toISOString(),
  });

  // Fetch settings and queue data
  useEffect(() => {
    if (session) {
      fetchSettings();
      fetchQueueData();
    }
  }, [session]);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/settings");
      if (response.ok) {
        const data = await response.json();
        setSettings({
          autoRemindEnabled: data.settings?.autoRemindEnabled ?? true,
          reminderDay1: data.settings?.reminderDay1 || 3,
          reminderDay2: data.settings?.reminderDay2 || 7,
          reminderDay3: data.settings?.reminderDay3 || 14,
          emailNotificationsEnabled: data.settings?.emailNotificationsEnabled ?? true,
          soundNotificationsEnabled: data.settings?.soundNotificationsEnabled ?? true,
        });
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  };

  const fetchQueueData = async () => {
    try {
      // Fetch queue stats
      const statsResponse = await fetch("/api/reminders/queue");
      if (statsResponse.ok) {
        const data = await statsResponse.json();
        setQueueStats(data.stats || queueStats);
        setQueueItems(data.items || []);
        setRateLimitStatus(data.rateLimit || rateLimitStatus);
      }
    } catch (error) {
      console.error("Error fetching queue data:", error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast.success("Paramètres de relance enregistrés");
      } else {
        toast.error("Erreur lors de l'enregistrement");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchQueueData();
    setRefreshing(false);
    toast.success("Données actualisées");
  };

  const handleCancelQueueItem = async (id: string) => {
    try {
      const response = await fetch(`/api/reminders/queue/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Relance annulée");
        fetchQueueData();
      } else {
        toast.error("Erreur lors de l'annulation");
      }
    } catch (error) {
      console.error("Error cancelling queue item:", error);
      toast.error("Erreur lors de l'annulation");
    }
  };

  const handleRetryFailed = async () => {
    try {
      const response = await fetch("/api/reminders/queue/retry", {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`${data.retried} relances reprogrammées`);
        fetchQueueData();
      } else {
        toast.error("Erreur lors de la reprogrammation");
      }
    } catch (error) {
      console.error("Error retrying failed items:", error);
      toast.error("Erreur lors de la reprogrammation");
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">En attente</Badge>;
      case "processing":
        return <Badge variant="default" className="bg-blue-500">En cours</Badge>;
      case "sent":
        return <Badge variant="default" className="bg-green-500">Envoyée</Badge>;
      case "failed":
        return <Badge variant="destructive">Échec</Badge>;
      case "cancelled":
        return <Badge variant="outline">Annulée</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Get reminder type label
  const getReminderTypeLabel = (type: string) => {
    switch (type) {
      case "first":
        return "1ère relance";
      case "second":
        return "2ème relance";
      case "third":
        return "3ème relance";
      default:
        return type;
    }
  };

  // Get channel icon
  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "email":
        return "📧";
      case "whatsapp":
        return "📱";
      case "both":
        return "📧📱";
      default:
        return channel;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Bell className="h-6 w-6 text-orange-500" />
            Paramètres de relance
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Configurez les relances automatiques et gérez la file d&apos;attente
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Actualiser
          </Button>
          <Button
            className="bg-orange-500 hover:bg-orange-600"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Settings className="h-4 w-4 mr-2" />
            )}
            Enregistrer
          </Button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Auto Reminders Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              Relances automatiques
            </CardTitle>
            <CardDescription>
              Configurez le comportement des relances automatiques
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Main toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="font-medium">Activer les relances automatiques</p>
                <p className="text-sm text-gray-500">
                  Envoyer automatiquement des relances aux dates programmées
                </p>
              </div>
              <Switch
                checked={settings.autoRemindEnabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, autoRemindEnabled: checked })
                }
              />
            </div>

            {/* Reminder intervals */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Intervalle des relances
              </h4>
              <p className="text-sm text-gray-500">
                Nombre de jours après l&apos;échéance pour chaque relance
              </p>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>1ère relance</Label>
                  <Select
                    value={settings.reminderDay1.toString()}
                    onValueChange={(v) =>
                      setSettings({ ...settings, reminderDay1: parseInt(v) })
                    }
                    disabled={!settings.autoRemindEnabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 5, 7].map((d) => (
                        <SelectItem key={d} value={d.toString()}>
                          J+{d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>2ème relance</Label>
                  <Select
                    value={settings.reminderDay2.toString()}
                    onValueChange={(v) =>
                      setSettings({ ...settings, reminderDay2: parseInt(v) })
                    }
                    disabled={!settings.autoRemindEnabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[5, 7, 10, 14].map((d) => (
                        <SelectItem key={d} value={d.toString()}>
                          J+{d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>3ème relance</Label>
                  <Select
                    value={settings.reminderDay3.toString()}
                    onValueChange={(v) =>
                      setSettings({ ...settings, reminderDay3: parseInt(v) })
                    }
                    disabled={!settings.autoRemindEnabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[10, 14, 21, 30].map((d) => (
                        <SelectItem key={d} value={d.toString()}>
                          J+{d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Schedule times info */}
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Heures d&apos;envoi :</strong> Les relances sont envoyées entre 8h et 20h
                (heure d&apos;Afrique de l&apos;Ouest), du lundi au samedi.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Queue Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-orange-500" />
              État de la file d&apos;attente
            </CardTitle>
            <CardDescription>
              Statistiques des relances planifiées
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg text-center">
                <p className="text-2xl font-bold text-yellow-600">{queueStats.pending}</p>
                <p className="text-sm text-yellow-700">En attente</p>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg text-center">
                <p className="text-2xl font-bold text-blue-600">{queueStats.processing}</p>
                <p className="text-sm text-blue-700">En cours</p>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-600">{queueStats.sent}</p>
                <p className="text-sm text-green-700">Envoyées</p>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg text-center">
                <p className="text-2xl font-bold text-red-600">{queueStats.failed}</p>
                <p className="text-sm text-red-700">Échecs</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                <p className="text-2xl font-bold text-gray-600">{queueStats.cancelled}</p>
                <p className="text-sm text-gray-700">Annulées</p>
              </div>
              <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg text-center">
                <p className="text-2xl font-bold text-orange-600">{queueStats.total}</p>
                <p className="text-sm text-orange-700">Total</p>
              </div>
            </div>

            {/* Rate limit status */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Limite de débit (par heure)</span>
                <span>{rateLimitStatus.count} / {rateLimitStatus.limit}</span>
              </div>
              <Progress
                value={(rateLimitStatus.count / rateLimitStatus.limit) * 100}
                className="h-2"
              />
              <p className="text-xs text-gray-500">
                Réinitialisation à {formatDate(rateLimitStatus.resetAt)}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleRetryFailed}
                disabled={queueStats.failed === 0}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Réessayer les échecs ({queueStats.failed})
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Queue Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            Relances planifiées
          </CardTitle>
          <CardDescription>
            Liste des relances en attente d&apos;envoi
          </CardDescription>
        </CardHeader>
        <CardContent>
          {queueItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune relance planifiée</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Planifiée pour</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Tentatives</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queueItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {getReminderTypeLabel(item.reminderType)}
                      </TableCell>
                      <TableCell>{getChannelIcon(item.channel)}</TableCell>
                      <TableCell>{formatDate(item.scheduledAt)}</TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell>
                        {item.attempts}/{item.maxAttempts}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.status === "pending" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelQueueItem(item.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium">Messages personnalisés par IA</h4>
                <p className="text-sm text-gray-500">
                  L&apos;IA adapte automatiquement le ton et le contenu de chaque relance
                  selon le profil du client et l&apos;historique des paiements.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <AlertCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium">Envoi intelligent</h4>
                <p className="text-sm text-gray-500">
                  Les relances sont envoyées aux heures optimales (8h-20h) et respectent
                  les limites de débit pour éviter le spam.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
