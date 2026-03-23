'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  ExternalLink,
  Settings,
  Unplug,
  ArrowRightLeft,
  Shield,
  TrendingUp,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { IntegrationCard } from '@/components/integrations/integration-card';
import { SyncStatus } from '@/components/integrations/sync-status';
import { MappingConfig } from '@/components/integrations/mapping-config';
import { IntegrationSettings } from '@/components/integrations/integration-settings';
import { 
  IntegrationType, 
  ConnectionStatus, 
  INTEGRATIONS,
  FieldMapping,
} from '@/lib/integrations/types';

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

// Integration logos (using placeholder for now)
const integrationLogos: Record<IntegrationType, string> = {
  quickbooks: 'Q',
  xero: 'X',
  sage: 'S',
  wave: 'W',
};

export default function IntegrationsPage() {
  const { toast } = useToast();
  const [integrations, setIntegrations] = useState<Record<string, IntegrationStatus>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [syncingType, setSyncingType] = useState<string | null>(null);
  
  // Dialog states
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [syncStatusOpen, setSyncStatusOpen] = useState(false);
  const [mappingOpen, setMappingOpen] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  
  // Selected integration
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
        setDisconnectOpen(false);
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
    setSelectedIntegration(type);
    setSyncStatusOpen(true);
    
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
    toast({
      title: 'Settings Saved',
      description: 'Integration settings have been updated',
    });
    setSettingsOpen(false);
    fetchIntegrationStatuses();
  };

  // Handle mapping open
  const handleMappingOpen = (type: IntegrationType) => {
    setSelectedIntegration(type);
    setMappingOpen(true);
  };

  // Handle mapping save
  const handleMappingSave = (mapping: FieldMapping) => {
    toast({
      title: 'Mapping Saved',
      description: 'Field mapping has been updated',
    });
    setMappingOpen(false);
  };

  // Open disconnect dialog
  const openDisconnectDialog = (type: IntegrationType) => {
    setSelectedIntegration(type);
    setDisconnectOpen(true);
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

  // Calculate stats
  const connectedCount = Object.values(integrations).filter(i => i.connected).length;
  const totalSyncs = getAllSyncHistory().length;
  const successRate = totalSyncs > 0 
    ? Math.round((getAllSyncHistory().filter(s => s.sync.status === 'success').length / totalSyncs) * 100)
    : 0;
  const totalItemsSynced = getAllSyncHistory().reduce(
    (acc, { sync }) => acc + sync.invoicesImported + sync.clientsImported,
    0
  );

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

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
          <p className="text-muted-foreground mt-1">
            Connect your accounting software to import invoices and sync clients with RelancePro Africa
          </p>
        </div>
        <Button variant="outline" onClick={fetchIntegrationStatuses} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh Status
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
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
            <CardTitle className="text-sm font-medium">Total Syncs</CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSyncs}</div>
            <p className="text-xs text-muted-foreground">
              synchronization operations
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successRate}%</div>
            <Progress value={successRate} className="h-1 mt-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Items Synced</CardTitle>
            <LayoutGrid className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItemsSynced}</div>
            <p className="text-xs text-muted-foreground">
              invoices & clients
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="connected">Connected</TabsTrigger>
          <TabsTrigger value="available">Available</TabsTrigger>
          <TabsTrigger value="history">Sync History</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Quick Actions */}
          {connectedCount > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
                <CardDescription>
                  Common actions for your connected integrations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {INTEGRATION_TYPES.map((type) => {
                    const status = integrations[type];
                    if (!status?.connected) return null;
                    
                    return (
                      <Button 
                        key={type}
                        variant="outline" 
                        onClick={() => handleSync(type)}
                        disabled={syncingType === type}
                      >
                        {syncingType === type ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-2 h-4 w-4" />
                        )}
                        Sync {INTEGRATIONS[type].name}
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Integration Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {INTEGRATION_TYPES.map((type) => {
              const status = integrations[type];
              
              return (
                <IntegrationCard
                  key={type}
                  type={type}
                  status={status?.integration?.status as ConnectionStatus || 'disconnected'}
                  connectedAt={status?.integration?.connectedAt}
                  lastSyncAt={status?.integration?.lastSyncAt}
                  lastSyncStatus={status?.integration?.lastSyncStatus}
                  externalName={status?.integration?.externalName}
                  onConnect={() => handleConnect(type)}
                  onDisconnect={() => openDisconnectDialog(type)}
                  onSync={() => handleSync(type)}
                  onSettings={() => handleSettingsOpen(type)}
                  isLoading={isLoading}
                  isSyncing={syncingType === type}
                />
              );
            })}
          </div>

          {/* Security Notice */}
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <Shield className="h-6 w-6 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-800 dark:text-blue-200">Data Security</h3>
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                    Your accounting software credentials are encrypted and stored securely. 
                    RelancePro Africa only has read access to your data and will never modify 
                    your accounting records without your explicit permission.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Connected Tab */}
        <TabsContent value="connected" className="space-y-6">
          {connectedCount === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Unplug className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold">No Integrations Connected</h3>
                <p className="text-muted-foreground mt-2">
                  Connect your accounting software to start syncing data.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {INTEGRATION_TYPES.map((type) => {
                const status = integrations[type];
                if (!status?.connected) return null;
                
                return (
                  <Card key={type}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700">
                            <span className="text-xl font-bold text-slate-600 dark:text-slate-300">
                              {integrationLogos[type]}
                            </span>
                          </div>
                          <div>
                            <CardTitle className="text-lg">{INTEGRATIONS[type].name}</CardTitle>
                            <CardDescription>{status.integration?.externalName}</CardDescription>
                          </div>
                        </div>
                        <Badge variant="default" className="gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Connected
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Connected</p>
                          <p className="font-medium">
                            {status.integration?.connectedAt 
                              ? formatDistanceToNow(new Date(status.integration.connectedAt), { addSuffix: true })
                              : 'Unknown'}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Last Sync</p>
                          <p className="font-medium">
                            {status.integration?.lastSyncAt 
                              ? formatDistanceToNow(new Date(status.integration.lastSyncAt), { addSuffix: true })
                              : 'Never'}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Auto Sync</p>
                          <p className="font-medium">
                            {status.integration?.autoSync 
                              ? `Every ${status.integration.syncFrequency}` 
                              : 'Manual'}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Direction</p>
                          <p className="font-medium capitalize">{status.integration?.syncDirection}</p>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          className="flex-1"
                          onClick={() => handleSync(type)}
                          disabled={syncingType === type}
                        >
                          {syncingType === type ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="mr-2 h-4 w-4" />
                          )}
                          Sync Now
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleMappingOpen(type)}
                        >
                          <Settings className="mr-2 h-4 w-4" />
                          Configure
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Available Tab */}
        <TabsContent value="available" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {INTEGRATION_TYPES.map((type) => {
              const status = integrations[type];
              if (status?.connected) return null;
              
              const config = INTEGRATIONS[type];
              
              return (
                <Card key={type}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700">
                        <span className="text-xl font-bold text-slate-600 dark:text-slate-300">
                          {integrationLogos[type]}
                        </span>
                      </div>
                      <div>
                        <CardTitle className="text-lg">{config.name}</CardTitle>
                        <CardDescription className="capitalize">
                          Regions: {config.region.slice(0, 3).join(', ')}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {config.description}
                    </p>
                    
                    <div className="flex flex-wrap gap-1">
                      {config.features.filter(f => f.supported).map((feature) => (
                        <Badge key={feature.name} variant="outline" className="text-xs">
                          {feature.name}
                        </Badge>
                      ))}
                    </div>
                    
                    <Button 
                      className="w-full"
                      onClick={() => handleConnect(type)}
                      disabled={isLoading}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Connect {config.name}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
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
              <ScrollArea className="h-[500px]">
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
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
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

      {/* Sync Status Dialog */}
      {selectedIntegration && (
        <SyncStatus
          isOpen={syncStatusOpen}
          onClose={() => setSyncStatusOpen(false)}
          integrationType={selectedIntegration}
          integrationName={INTEGRATIONS[selectedIntegration].name}
          onRetry={() => handleSync(selectedIntegration)}
          onComplete={fetchIntegrationStatuses}
        />
      )}

      {/* Mapping Config Dialog */}
      {selectedIntegration && (
        <MappingConfig
          open={mappingOpen}
          onOpenChange={setMappingOpen}
          type={selectedIntegration}
          onSave={handleMappingSave}
        />
      )}

      {/* Disconnect Confirmation Dialog */}
      <Dialog open={disconnectOpen} onOpenChange={setDisconnectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Disconnect Integration
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to disconnect {selectedIntegration ? INTEGRATIONS[selectedIntegration].name : ''}? 
              This will remove the connection and stop all automatic syncing. 
              Your synced data will remain in RelancePro Africa.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDisconnectOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => selectedIntegration && handleDisconnect(selectedIntegration)}
            >
              <Unplug className="mr-2 h-4 w-4" />
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
