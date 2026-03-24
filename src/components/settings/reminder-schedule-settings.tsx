"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Bell,
  Calendar,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  REMINDER_INTERVALS,
  TIME_SLOTS,
  MAX_REMINDERS_OPTIONS,
} from "@/lib/cron/config";

interface ScheduleSettings {
  autoRemindEnabled: boolean;
  reminderDay1: number;
  reminderDay2: number;
  reminderDay3: number;
  skipWeekends: boolean;
  reminderStartTime: string;
  reminderEndTime: string;
  maxReminders: number;
}

interface ScheduleSettingsProps {
  profileId?: string;
  onSettingsChange?: (settings: ScheduleSettings) => void;
}

export function ReminderScheduleSettings({ 
  profileId,
  onSettingsChange 
}: ScheduleSettingsProps) {
  const [settings, setSettings] = useState<ScheduleSettings>({
    autoRemindEnabled: true,
    reminderDay1: 3,
    reminderDay2: 7,
    reminderDay3: 14,
    skipWeekends: false,
    reminderStartTime: "09:00",
    reminderEndTime: "18:00",
    maxReminders: 3,
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalSettings, setOriginalSettings] = useState<ScheduleSettings | null>(null);

  // Fetch current settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch("/api/settings");
        if (response.ok) {
          const data = await response.json();
          const settingsData: ScheduleSettings = {
            autoRemindEnabled: data.settings?.autoRemindEnabled ?? true,
            reminderDay1: data.settings?.reminderDay1 ?? 3,
            reminderDay2: data.settings?.reminderDay2 ?? 7,
            reminderDay3: data.settings?.reminderDay3 ?? 14,
            skipWeekends: data.settings?.skipWeekends ?? false,
            reminderStartTime: data.settings?.reminderStartTime ?? "09:00",
            reminderEndTime: data.settings?.reminderEndTime ?? "18:00",
            maxReminders: data.settings?.maxReminders ?? 3,
          };
          setSettings(settingsData);
          setOriginalSettings(settingsData);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
        toast.error("Erreur lors du chargement des paramètres");
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // Check for changes
  useEffect(() => {
    if (originalSettings) {
      const changed = JSON.stringify(settings) !== JSON.stringify(originalSettings);
      setHasChanges(changed);
    }
  }, [settings, originalSettings]);

  const updateSetting = <K extends keyof ScheduleSettings>(
    key: K,
    value: ScheduleSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setOriginalSettings(settings);
        setHasChanges(false);
        toast.success("Paramètres enregistrés avec succès");
        onSettingsChange?.(settings);
      } else {
        throw new Error("Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Erreur lors de l'enregistrement des paramètres");
    } finally {
      setSaving(false);
    }
  };

  const resetSettings = () => {
    if (originalSettings) {
      setSettings(originalSettings);
      setHasChanges(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">Chargement...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-orange-600" />
              Planification des relances automatiques
            </CardTitle>
            <CardDescription>
              Configurez quand et comment les relances automatiques sont envoyées
            </CardDescription>
          </div>
          {settings.autoRemindEnabled ? (
            <Badge className="bg-green-100 text-green-700 border-green-200">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Actif
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-gray-100 text-gray-600">
              <AlertCircle className="h-3 w-3 mr-1" />
              Désactivé
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6 pt-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto-remind" className="text-base font-medium">
              Relances automatiques
            </Label>
            <p className="text-sm text-muted-foreground">
              Activer l'envoi automatique des relances selon le calendrier
            </p>
          </div>
          <Switch
            id="auto-remind"
            checked={settings.autoRemindEnabled}
            onCheckedChange={(checked) => updateSetting("autoRemindEnabled", checked)}
          />
        </div>

        <Separator />

        {/* Reminder Intervals */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-orange-600" />
            <Label className="text-base font-medium">Intervalles de relance</Label>
          </div>
          <p className="text-sm text-muted-foreground">
            Nombre de jours après l'échéance pour chaque relance
          </p>
          
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="day1" className="text-sm">
                1ère relance
              </Label>
              <Select
                value={settings.reminderDay1.toString()}
                onValueChange={(value) => updateSetting("reminderDay1", parseInt(value))}
                disabled={!settings.autoRemindEnabled}
              >
                <SelectTrigger id="day1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REMINDER_INTERVALS.map((interval) => (
                    <SelectItem 
                      key={`day1-${interval.value}`} 
                      value={interval.value.toString()}
                    >
                      {interval.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="day2" className="text-sm">
                2ème relance
              </Label>
              <Select
                value={settings.reminderDay2.toString()}
                onValueChange={(value) => updateSetting("reminderDay2", parseInt(value))}
                disabled={!settings.autoRemindEnabled}
              >
                <SelectTrigger id="day2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REMINDER_INTERVALS.map((interval) => (
                    <SelectItem 
                      key={`day2-${interval.value}`} 
                      value={interval.value.toString()}
                    >
                      {interval.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="day3" className="text-sm">
                3ème relance
              </Label>
              <Select
                value={settings.reminderDay3.toString()}
                onValueChange={(value) => updateSetting("reminderDay3", parseInt(value))}
                disabled={!settings.autoRemindEnabled}
              >
                <SelectTrigger id="day3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REMINDER_INTERVALS.map((interval) => (
                    <SelectItem 
                      key={`day3-${interval.value}`} 
                      value={interval.value.toString()}
                    >
                      {interval.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        {/* Time Window */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-600" />
            <Label className="text-base font-medium">Fenêtre horaire</Label>
          </div>
          <p className="text-sm text-muted-foreground">
            Les relances ne seront envoyées qu'entre ces heures
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start-time" className="text-sm">
                Heure de début
              </Label>
              <Select
                value={settings.reminderStartTime}
                onValueChange={(value) => updateSetting("reminderStartTime", value)}
                disabled={!settings.autoRemindEnabled}
              >
                <SelectTrigger id="start-time">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map((slot) => (
                    <SelectItem key={`start-${slot.value}`} value={slot.value}>
                      {slot.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-time" className="text-sm">
                Heure de fin
              </Label>
              <Select
                value={settings.reminderEndTime}
                onValueChange={(value) => updateSetting("reminderEndTime", value)}
                disabled={!settings.autoRemindEnabled}
              >
                <SelectTrigger id="end-time">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map((slot) => (
                    <SelectItem key={`end-${slot.value}`} value={slot.value}>
                      {slot.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        {/* Additional Options */}
        <div className="space-y-4">
          <Label className="text-base font-medium">Options supplémentaires</Label>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="skip-weekends">Ignorer les weekends</Label>
              <p className="text-sm text-muted-foreground">
                Les relances prévues le weekend seront envoyées le lundi
              </p>
            </div>
            <Switch
              id="skip-weekends"
              checked={settings.skipWeekends}
              onCheckedChange={(checked) => updateSetting("skipWeekends", checked)}
              disabled={!settings.autoRemindEnabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="max-reminders">Nombre maximum de relances</Label>
            <Select
              value={settings.maxReminders.toString()}
              onValueChange={(value) => updateSetting("maxReminders", parseInt(value))}
              disabled={!settings.autoRemindEnabled}
            >
              <SelectTrigger id="max-reminders" className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MAX_REMINDERS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Nombre maximum de relances automatiques par créance
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            {hasChanges ? (
              <span className="text-amber-600">Modifications non enregistrées</span>
            ) : (
              <span className="text-green-600">Tous les changements sont enregistrés</span>
            )}
          </p>
          <div className="flex gap-2">
            {hasChanges && (
              <Button
                variant="outline"
                onClick={resetSettings}
                disabled={saving}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Annuler
              </Button>
            )}
            <Button
              onClick={saveSettings}
              disabled={!hasChanges || saving}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Enregistrer
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ReminderScheduleSettings;
