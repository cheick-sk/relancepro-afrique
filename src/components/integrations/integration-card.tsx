'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Loader2,
  MoreVertical,
  RefreshCw,
  Settings,
  Unplug,
  Check,
  AlertCircle,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { IntegrationType, ConnectionStatus, INTEGRATIONS } from '@/lib/integrations/types';

interface IntegrationCardProps {
  type: IntegrationType;
  status: ConnectionStatus;
  connectedAt?: Date | null;
  lastSyncAt?: Date | null;
  lastSyncStatus?: string | null;
  externalName?: string | null;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onSync?: () => void;
  onSettings?: () => void;
  isLoading?: boolean;
  isSyncing?: boolean;
}

const statusConfig: Record<ConnectionStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType }> = {
  connected: { label: 'Connected', variant: 'default', icon: Check },
  disconnected: { label: 'Disconnected', variant: 'secondary', icon: Unplug },
  expired: { label: 'Expired', variant: 'destructive', icon: AlertCircle },
  error: { label: 'Error', variant: 'destructive', icon: AlertCircle },
  pending: { label: 'Connecting...', variant: 'outline', icon: Loader2 },
};

const syncStatusConfig: Record<string, { label: string; color: string }> = {
  success: { label: 'Synced', color: 'text-green-600' },
  failed: { label: 'Failed', color: 'text-red-600' },
  partial: { label: 'Partial', color: 'text-yellow-600' },
  running: { label: 'Syncing...', color: 'text-blue-600' },
};

export function IntegrationCard({
  type,
  status,
  connectedAt,
  lastSyncAt,
  lastSyncStatus,
  externalName,
  onConnect,
  onDisconnect,
  onSync,
  onSettings,
  isLoading,
  isSyncing,
}: IntegrationCardProps) {
  const [showProgress, setShowProgress] = useState(false);
  
  const config = INTEGRATIONS[type];
  const statusInfo = statusConfig[status];
  const syncInfo = lastSyncStatus ? syncStatusConfig[lastSyncStatus] : null;
  const StatusIcon = statusInfo.icon;

  const handleSync = () => {
    if (onSync) {
      setShowProgress(true);
      onSync();
      setTimeout(() => setShowProgress(false), 3000);
    }
  };

  return (
    <Card className="relative overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Logo placeholder - would use actual logos in production */}
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700">
              <span className="text-xl font-bold text-slate-600 dark:text-slate-300">
                {type.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-lg">{config?.name || type}</h3>
              {externalName && (
                <p className="text-sm text-muted-foreground">{externalName}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant={statusInfo.variant} className="gap-1">
              <StatusIcon className={`h-3 w-3 ${status === 'pending' ? 'animate-spin' : ''}`} />
              {statusInfo.label}
            </Badge>
            
            {status === 'connected' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleSync} disabled={isSyncing}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    Sync Now
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onSettings}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={onDisconnect}
                    className="text-destructive focus:text-destructive"
                  >
                    <Unplug className="mr-2 h-4 w-4" />
                    Disconnect
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {config?.description}
        </p>
        
        {/* Features */}
        {config?.features && (
          <div className="flex flex-wrap gap-1">
            {config.features.filter(f => f.supported).slice(0, 3).map((feature) => (
              <Badge key={feature.name} variant="outline" className="text-xs">
                {feature.name}
              </Badge>
            ))}
          </div>
        )}
        
        {/* Sync Status */}
        {status === 'connected' && (
          <div className="space-y-2">
            {showProgress && (
              <Progress value={66} className="h-1" />
            )}
            
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                {lastSyncAt ? (
                  <span>
                    Last sync: {formatDistanceToNow(new Date(lastSyncAt), { addSuffix: true })}
                  </span>
                ) : (
                  <span>Never synced</span>
                )}
              </div>
              
              {syncInfo && (
                <span className={`font-medium ${syncInfo.color}`}>
                  {syncInfo.label}
                </span>
              )}
            </div>
          </div>
        )}
        
        {/* Connection Info */}
        {status === 'connected' && connectedAt && (
          <div className="text-xs text-muted-foreground">
            Connected {formatDistanceToNow(new Date(connectedAt), { addSuffix: true })}
          </div>
        )}
        
        {/* Action Button */}
        {status !== 'connected' && (
          <Button
            onClick={onConnect}
            disabled={isLoading || status === 'pending'}
            className="w-full"
          >
            {isLoading || status === 'pending' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <ExternalLink className="mr-2 h-4 w-4" />
                Connect {config?.name}
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
