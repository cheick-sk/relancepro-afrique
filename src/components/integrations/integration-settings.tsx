'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, RefreshCw } from 'lucide-react';
import { IntegrationType, SyncDirection, SyncFrequency, INTEGRATIONS } from '@/lib/integrations/types';

interface IntegrationSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: IntegrationType;
  settings: {
    syncDirection: SyncDirection;
    autoSync: boolean;
    syncFrequency: SyncFrequency;
  };
  onSave: (settings: {
    syncDirection: SyncDirection;
    autoSync: boolean;
    syncFrequency: SyncFrequency;
  }) => void;
  onSync?: () => void;
  isLoading?: boolean;
  isSyncing?: boolean;
}

const syncDirectionOptions: { value: SyncDirection; label: string; description: string }[] = [
  { value: 'import', label: 'Import Only', description: 'Import data from accounting software' },
  { value: 'export', label: 'Export Only', description: 'Export data to accounting software' },
  { value: 'both', label: 'Both', description: 'Import and export data bidirectionally' },
];

const syncFrequencyOptions: { value: SyncFrequency; label: string }[] = [
  { value: 'hourly', label: 'Every Hour' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'manual', label: 'Manual Only' },
];

export function IntegrationSettings({
  open,
  onOpenChange,
  type,
  settings,
  onSave,
  onSync,
  isLoading,
  isSyncing,
}: IntegrationSettingsProps) {
  const [syncDirection, setSyncDirection] = useState<SyncDirection>(settings.syncDirection);
  const [autoSync, setAutoSync] = useState(settings.autoSync);
  const [syncFrequency, setSyncFrequency] = useState<SyncFrequency>(settings.syncFrequency);
  const [isSaving, setIsSaving] = useState(false);

  const config = INTEGRATIONS[type];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        syncDirection,
        autoSync,
        syncFrequency,
      });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {config?.name} Settings
          </DialogTitle>
          <DialogDescription>
            Configure how {config?.name} syncs with RelancePro Africa.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Sync Direction */}
          <div className="space-y-3">
            <Label className="text-base">Sync Direction</Label>
            <div className="grid gap-2">
              {syncDirectionOptions.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    syncDirection === option.value
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="syncDirection"
                    value={option.value}
                    checked={syncDirection === option.value}
                    onChange={() => setSyncDirection(option.value)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium">{option.label}</div>
                    <div className="text-sm text-muted-foreground">
                      {option.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <Separator />

          {/* Auto Sync */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Auto Sync</Label>
              <p className="text-sm text-muted-foreground">
                Automatically sync data on a schedule
              </p>
            </div>
            <Switch
              checked={autoSync}
              onCheckedChange={setAutoSync}
            />
          </div>

          {/* Sync Frequency */}
          {autoSync && (
            <div className="space-y-2">
              <Label>Sync Frequency</Label>
              <Select
                value={syncFrequency}
                onValueChange={(value) => setSyncFrequency(value as SyncFrequency)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  {syncFrequencyOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Separator />

          {/* Features */}
          <div className="space-y-2">
            <Label className="text-base">Available Features</Label>
            <div className="flex flex-wrap gap-2">
              {config?.features.map((feature) => (
                <Badge
                  key={feature.name}
                  variant={feature.supported ? 'default' : 'secondary'}
                  className="gap-1"
                >
                  {feature.supported ? '✓' : '✗'} {feature.name}
                </Badge>
              ))}
            </div>
          </div>

          {/* Region Support */}
          {config?.region && (
            <div className="space-y-2">
              <Label className="text-base">Regions Supported</Label>
              <div className="flex flex-wrap gap-2">
                {config.region.map((region) => (
                  <Badge key={region} variant="outline">
                    {region}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {onSync && (
            <Button
              variant="outline"
              onClick={onSync}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Sync Now
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={isSaving || isLoading}
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
