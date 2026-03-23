'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  RefreshCw,
  History,
  LayoutGrid,
  AlertTriangle,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { IntegrationCard } from '@/components/integrations/integration-card';
import { IntegrationSettings } from '@/components/integrations/integration-settings';
import { IntegrationType, ConnectionStatus, INTEGRATIONS } from '@/lib/integrations/types';

interface IntegrationStatus {
  connected: boolean;
  integration: {
    id: string;
    type: string;
    status: string;
    connectedAt: string | null;
    lastSyncAt: string | null;
    lastSyncStatus: string | null;
    externalName: string | null;
    syncDirection: string;
    autoSync: boolean;
    syncFrequency: string;
  } | null;
  recentSyncs: Array<{
    id: string;
    syncType: string;
    direction: string;
    status: string;
    startedAt: string;
    completedAt: string | null;
    invoicesImported: number;
    clientsImported: number;
    errorMessage: string | null;
  }>;
}

const INTEGRATION_TYPES: IntegrationType[] = ['quickbooks', 'xero', 'sage', 'wave'];

export default function IntegrationsPage() {
  const { toast } = useToast();
  const [integrations, setIntegrations] = useState<Record<string, IntegrationStatus>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [syncingType, setSyncingType] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationType | null>(null);
  const [currentSettings, setCurrentSettings] = useState({
    syncDirection: 'import' as 'import' | 'export' | 'both',
    autoSync: false,
    syncFrequency: 'daily' as 'hourly' | 'daily' | 'weekly' | 'manual',
  });

  // Fetch all integration statuses
  const fetchIntegrationStatuses = useCallback(async () => {
    setIsLoading(true);
    try {
      const statuses: Record<string, IntegrationStatus> = {};
      
      for (const type of INTEGRATION_TYPES) {
        try {
          const response = await fetch(`/api/integrations/${type}/sync`);
          if (response.ok) {
            const data = await response.json();
            statuses[type] = data;
          } else {
            statuses[type] = { connected: false, integration: null, recentSyncs: [] };
          }
        } catch {
          statuses[type] = { connected: false, integration: null, recentSyncs: [] };
        }
      }
      
      setIntegrations(statuses);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrationStatuses();
  }, [fetchIntegrationStatuses]);

  // Handle connect
  const handleConnect = async (type: IntegrationType) => {
    try {
      const response = await fetch(`/api/integrations/${type}/connect`);
      const data = await response.json();
      
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      }
    } catch (error) {
      toast({
        title: 'Connection Failed',
        description: error instanceof Error ? error.message : 'Failed to connect integration',
        variant: 'destructive',
      });
    }
  };

  // Handle disconnect
  const handleDisconnect = async (type: IntegrationType) => {
    try {
      const response = await fetch(`/api/integrations/${type}/sync`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        toast({
          title: 'Disconnected',
          description: `Successfully disconnected from ${INTEGRATIONS[type].name}`,
        });
        fetchIntegrationStatuses();
      }
    } catch (error) {
      toast({
        title: 'Disconnect Failed',
        description: error instanceof Error ? error.message : 'Failed to disconnect',
        variant: 'destructive',
      });
    }
  };

  // Handle sync
  const handleSync = async (type: IntegrationType) => {
    setSyncingType(type);
    try {
      const response = await fetch(`/api/integrations/${type}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncType: 'full', direction: 'import' }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: 'Sync Complete',
          description: `Imported ${data.invoicesImported} invoices and ${data.clientsImported} clients`,
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: 'Sync Failed',
        description: error instanceof Error ? error.message : 'Failed to sync',
        variant: 'destructive',
      });
    } finally {
      setSyncingType(null);
      fetchIntegrationStatuses();
    }
  };

  // Handle settings open
  const handleSettingsOpen = (type: IntegrationType) => {
    const integration = integrations[type]?.integration;
    if (integration) {
      setCurrentSettings({
        syncDirection: integration.syncDirection as 'import' | 'export' | 'both',
        autoSync: integration.autoSync,
        syncFrequency: integration.syncFrequency as 'hourly' | 'daily' | 'weekly' | 'manual',
      });
      setSelectedIntegration(type);
      setSettingsOpen(true);
    }
  };

  // Handle settings save
  const handleSettingsSave = async (settings: typeof currentSettings) => {
    // In a real implementation, this would save to the backend
    toast({
      title: 'Settings Saved',
      description: 'Integration settings have been updated',
    });
    setSettingsOpen(false);
    fetchIntegrationStatuses();
  };

  // Get all sync history
  const getAllSyncHistory = () => {
    const allSyncs: Array<{ type: string; sync: IntegrationStatus['recentSyncs'][0] }> = [];
    
    for (const [type, status] of Object.entries(integrations)) {
      for (const sync of status.recentSyncs) {
        allSyncs.push({ type, sync });
      }
    }
    
    return allSyncs.sort((a, b) => 
      new Date(b.sync.startedAt).getTime() - new Date(a.sync.startedAt).getTime()
    );
  };

  // Check for URL params (success/error from OAuth)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const error = params.get('error');
    
    if (success) {
      toast({
        title: 'Connected Successfully',
        description: `Your ${success.replace('_connected', '')} account has been connected`,
      });
      window.history.replaceState({}, '', window.location.pathname);
      fetchIntegrationStatuses();
    }
    
    if (error) {
      toast({
        title: 'Connection Failed',
        description: error,
        variant: 'destructive',
      });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [toast, fetchIntegrationStatuses]);

  const connectedCount = Object.values(integrations).filter(i => i.connected).length;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Integrations</h1>
          <p className="text-muted-foreground mt-1">
            Connect your accounting software to import invoices and sync clients
          </p>
        </div>
        <Button variant="outline" onClick={fetchIntegrationStatuses} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connected</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{connectedCount}</div>
            <p className="text-xs text-muted-foreground">
              of {INTEGRATION_TYPES.length} integrations
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <LayoutGrid className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{INTEGRATION_TYPES.length - connectedCount}</div>
            <p className="text-xs text-muted-foreground">
              integrations ready to connect
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Sync</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.values(integrations).some(i => i.integration?.lastSyncAt)
                ? formatDistanceToNow(
                    new Date(
                      Math.max(
                        ...Object.values(integrations)
                          .filter(i => i.integration?.lastSyncAt)
                          .map(i => new Date(i.integration!.lastSyncAt!).getTime())
                      )
                    ),
                    { addSuffix: true }
                  )
                : 'Never'}
            </div>
            <p className="text-xs text-muted-foreground">
              across all integrations
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="integrations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="history">Sync History</TabsTrigger>
          <TabsTrigger value="errors">Error Logs</TabsTrigger>
        </TabsList>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-6">
          {/* Connected Integrations */}
          {connectedCount > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Connected</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {INTEGRATION_TYPES.map((type) => {
                  const status = integrations[type];
                  if (!status?.connected) return null;
                  
                  return (
                    <IntegrationCard
                      key={type}
                      type={type}
                      status={status.integration?.status as ConnectionStatus || 'connected'}
                      connectedAt={status.integration?.connectedAt}
                      lastSyncAt={status.integration?.lastSyncAt}
                      lastSyncStatus={status.integration?.lastSyncStatus}
                      externalName={status.integration?.externalName}
                      onDisconnect={() => handleDisconnect(type)}
                      onSync={() => handleSync(type)}
                      onSettings={() => handleSettingsOpen(type)}
                      isSyncing={syncingType === type}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Available Integrations */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Available Integrations</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {INTEGRATION_TYPES.map((type) => {
                const status = integrations[type];
                if (status?.connected) return null;
                
                return (
                  <IntegrationCard
                    key={type}
                    type={type}
                    status={status?.integration?.status as ConnectionStatus || 'disconnected'}
                    onConnect={() => handleConnect(type)}
                    isLoading={isLoading}
                  />
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* Sync History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Sync History
              </CardTitle>
              <CardDescription>
                View recent synchronization activities across all integrations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Integration</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Invoices</TableHead>
                      <TableHead>Clients</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Duration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getAllSyncHistory().length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          No sync history available
                        </TableCell>
                      </TableRow>
                    ) : (
                      getAllSyncHistory().map(({ type, sync }) => (
                        <TableRow key={sync.id}>
                          <TableCell>
                            <Badge variant="outline">{INTEGRATIONS[type as IntegrationType]?.name}</Badge>
                          </TableCell>
                          <TableCell className="capitalize">{sync.syncType}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                sync.status === 'success' ? 'default' :
                                sync.status === 'failed' ? 'destructive' :
                                sync.status === 'partial' ? 'secondary' : 'outline'
                              }
                            >
                              {sync.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{sync.invoicesImported}</TableCell>
                          <TableCell>{sync.clientsImported}</TableCell>
                          <TableCell>
                            {format(new Date(sync.startedAt), 'MMM d, yyyy HH:mm')}
                          </TableCell>
                          <TableCell>
                            {sync.completedAt
                              ? `${Math.round(
                                  (new Date(sync.completedAt).getTime() - new Date(sync.startedAt).getTime()) / 1000
                                )}s`
                              : '-'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Error Logs Tab */}
        <TabsContent value="errors">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Error Logs
              </CardTitle>
              <CardDescription>
                View errors from recent sync operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {getAllSyncHistory().filter(({ sync }) => sync.errorMessage).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mb-4 text-green-600" />
                    <p>No errors to display</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {getAllSyncHistory()
                      .filter(({ sync }) => sync.errorMessage)
                      .map(({ type, sync }) => (
                        <div key={sync.id} className="flex items-start gap-3 p-4 border rounded-lg bg-destructive/5">
                          <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium">{INTEGRATIONS[type as IntegrationType]?.name}</p>
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(sync.startedAt), 'MMM d, yyyy HH:mm')}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {sync.errorMessage}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Settings Dialog */}
      {selectedIntegration && (
        <IntegrationSettings
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          type={selectedIntegration}
          settings={currentSettings}
          onSave={handleSettingsSave}
          onSync={() => handleSync(selectedIntegration)}
          isSyncing={syncingType === selectedIntegration}
        />
      )}
    </div>
  );
}
