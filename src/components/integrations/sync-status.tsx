'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  RefreshCw,
  Users,
  FileText,
  CreditCard,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { SyncStatus as SyncStatusType } from '@/lib/integrations/types';

interface SyncProgress {
  status: SyncStatusType;
  progress: number;
  currentStep: string;
  itemsProcessed: number;
  totalItems: number;
  invoicesImported: number;
  invoicesExported: number;
  clientsImported: number;
  clientsExported: number;
  paymentsImported: number;
  paymentsExported: number;
  errors: SyncError[];
  startedAt: Date;
  completedAt?: Date;
}

interface SyncError {
  type: 'invoice' | 'client' | 'payment' | 'connection' | 'auth' | 'unknown';
  externalId?: string;
  message: string;
  details?: string;
}

interface SyncStatusProps {
  isOpen: boolean;
  onClose: () => void;
  integrationType: string;
  integrationName: string;
  syncId?: string;
  onRetry?: () => void;
  onComplete?: () => void;
}

const statusConfig: Record<SyncStatusType, { 
  label: string; 
  color: string; 
  bgColor: string;
  icon: React.ElementType;
}> = {
  pending: {
    label: 'Pending',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950',
    icon: Clock,
  },
  running: {
    label: 'Syncing...',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950',
    icon: Loader2,
  },
  success: {
    label: 'Completed',
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-950',
    icon: CheckCircle,
  },
  failed: {
    label: 'Failed',
    color: 'text-red-600',
    bgColor: 'bg-red-50 dark:bg-red-950',
    icon: XCircle,
  },
  partial: {
    label: 'Partial Success',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-950',
    icon: AlertTriangle,
  },
};

export function SyncStatus({
  isOpen,
  onClose,
  integrationType,
  integrationName,
  onRetry,
  onComplete,
}: SyncStatusProps) {
  const [syncProgress, setSyncProgress] = useState<SyncProgress>({
    status: 'pending',
    progress: 0,
    currentStep: 'Initializing...',
    itemsProcessed: 0,
    totalItems: 0,
    invoicesImported: 0,
    invoicesExported: 0,
    clientsImported: 0,
    clientsExported: 0,
    paymentsImported: 0,
    paymentsExported: 0,
    errors: [],
    startedAt: new Date(),
  });
  
  // Use ref to track if sync was started
  const syncStartedRef = useRef(false);

  const statusInfo = statusConfig[syncProgress.status];
  const StatusIcon = statusInfo.icon;

  // Simulate sync progress for demo - using setTimeout to avoid synchronous setState
  useEffect(() => {
    if (isOpen && !syncStartedRef.current) {
      syncStartedRef.current = true;
      
      // Start sync simulation after a microtask
      const startTimeout = setTimeout(() => {
        setSyncProgress(prev => ({
          ...prev,
          status: 'running',
          currentStep: 'Fetching data from ' + integrationName + '...',
        }));
      }, 0);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setSyncProgress(prev => {
          if (prev.progress >= 100 || prev.status !== 'running') {
            clearInterval(progressInterval);
            return prev;
          }
          
          const newProgress = Math.min(prev.progress + 10, 100);
          let newStep = prev.currentStep;
          
          if (newProgress >= 30 && newProgress < 60) {
            newStep = 'Processing invoices...';
          } else if (newProgress >= 60 && newProgress < 80) {
            newStep = 'Syncing clients...';
          } else if (newProgress >= 80 && newProgress < 100) {
            newStep = 'Finalizing...';
          } else if (newProgress >= 100) {
            newStep = 'Complete!';
          }
          
          return {
            ...prev,
            progress: newProgress,
            currentStep: newStep,
            itemsProcessed: Math.floor(newProgress * 1.5),
            totalItems: 150,
            invoicesImported: Math.floor(newProgress * 0.8),
            clientsImported: Math.floor(newProgress * 0.2),
          };
        });
      }, 500);

      // Complete after progress reaches 100
      const completeTimeout = setTimeout(() => {
        setSyncProgress(prev => ({
          ...prev,
          status: 'success',
          completedAt: new Date(),
          currentStep: 'Sync completed successfully!',
        }));
        onComplete?.();
      }, 6000);

      return () => {
        clearTimeout(startTimeout);
        clearInterval(progressInterval);
        clearTimeout(completeTimeout);
      };
    }
    
    // Reset when dialog closes
    if (!isOpen) {
      syncStartedRef.current = false;
    }
  }, [isOpen, integrationName, onComplete]);

  const handleRetry = () => {
    setSyncProgress({
      status: 'pending',
      progress: 0,
      currentStep: 'Initializing...',
      itemsProcessed: 0,
      totalItems: 0,
      invoicesImported: 0,
      invoicesExported: 0,
      clientsImported: 0,
      clientsExported: 0,
      paymentsImported: 0,
      paymentsExported: 0,
      errors: [],
      startedAt: new Date(),
    });
    onRetry?.();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StatusIcon 
              className={`h-5 w-5 ${statusInfo.color} ${
                syncProgress.status === 'running' ? 'animate-spin' : ''
              }`} 
            />
            Sync Status - {integrationName}
          </DialogTitle>
          <DialogDescription>
            {syncProgress.status === 'running'
              ? 'Please wait while we sync your data...'
              : syncProgress.status === 'success'
              ? 'Your data has been synced successfully.'
              : syncProgress.status === 'failed'
              ? 'Sync failed. Please try again.'
              : 'Preparing to sync...'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Progress Bar */}
          {(syncProgress.status === 'running' || syncProgress.status === 'pending') && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{syncProgress.currentStep}</span>
                <span className="font-medium">{syncProgress.progress}%</span>
              </div>
              <Progress value={syncProgress.progress} className="h-2" />
              {syncProgress.totalItems > 0 && (
                <p className="text-xs text-muted-foreground">
                  {syncProgress.itemsProcessed} of {syncProgress.totalItems} items processed
                </p>
              )}
            </div>
          )}

          {/* Status Badge */}
          <div className={`p-4 rounded-lg ${statusInfo.bgColor}`}>
            <div className="flex items-center gap-2">
              <StatusIcon 
                className={`h-5 w-5 ${statusInfo.color} ${
                  syncProgress.status === 'running' ? 'animate-spin' : ''
                }`} 
              />
              <span className={`font-medium ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
            </div>
            {syncProgress.startedAt && (
              <p className="text-sm text-muted-foreground mt-2">
                Started {formatDistanceToNow(new Date(syncProgress.startedAt), { addSuffix: true })}
              </p>
            )}
          </div>

          {/* Sync Summary */}
          {(syncProgress.status === 'success' || syncProgress.status === 'partial') && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Sync Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{syncProgress.invoicesImported}</p>
                      <p className="text-xs text-muted-foreground">Invoices Imported</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{syncProgress.clientsImported}</p>
                      <p className="text-xs text-muted-foreground">Clients Imported</p>
                    </div>
                  </div>
                  {syncProgress.paymentsImported > 0 && (
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{syncProgress.paymentsImported}</p>
                        <p className="text-xs text-muted-foreground">Payments Imported</p>
                      </div>
                    </div>
                  )}
                  {syncProgress.completedAt && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">
                          {Math.round(
                            (new Date(syncProgress.completedAt).getTime() - 
                             new Date(syncProgress.startedAt).getTime()) / 1000
                          )}s
                        </p>
                        <p className="text-xs text-muted-foreground">Duration</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Errors */}
          {syncProgress.errors.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                Errors ({syncProgress.errors.length})
              </h4>
              <div className="max-h-32 overflow-y-auto space-y-2">
                {syncProgress.errors.map((error, index) => (
                  <div key={index} className="p-2 rounded bg-destructive/10 text-sm">
                    <p className="font-medium text-destructive">{error.type}</p>
                    <p className="text-muted-foreground">{error.message}</p>
                    {error.details && (
                      <p className="text-xs text-muted-foreground mt-1">{error.details}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            {syncProgress.status === 'failed' && onRetry && (
              <Button onClick={handleRetry} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            )}
            <Button onClick={onClose}>
              {syncProgress.status === 'success' ? 'Done' : 'Close'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Compact version for inline display
interface SyncStatusCompactProps {
  status: SyncStatusType;
  lastSyncAt?: Date | null;
  itemsProcessed?: number;
  errorMessage?: string | null;
}

export function SyncStatusCompact({ 
  status, 
  lastSyncAt, 
  itemsProcessed,
  errorMessage 
}: SyncStatusCompactProps) {
  const statusInfo = statusConfig[status];
  const StatusIcon = statusInfo.icon;

  return (
    <div className="flex items-center gap-2">
      <Badge 
        variant={status === 'success' ? 'default' : status === 'failed' ? 'destructive' : 'secondary'}
        className="gap-1"
      >
        <StatusIcon className={`h-3 w-3 ${status === 'running' ? 'animate-spin' : ''}`} />
        {statusInfo.label}
      </Badge>
      {lastSyncAt && (
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(lastSyncAt), { addSuffix: true })}
        </span>
      )}
      {itemsProcessed !== undefined && itemsProcessed > 0 && (
        <span className="text-xs text-muted-foreground">
          • {itemsProcessed} items
        </span>
      )}
      {errorMessage && (
        <span className="text-xs text-destructive truncate max-w-[200px]" title={errorMessage}>
          • {errorMessage}
        </span>
      )}
    </div>
  );
}

export default SyncStatus;
