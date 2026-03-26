'use client';

/**
 * Audit Logs Page
 * Comprehensive audit log viewer with filters, stats, and export
 */

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Download,
  RefreshCw,
  FileText,
  FileJson,
  FileSpreadsheet,
  Activity,
  List,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { AuditLogTable, type AuditLog } from '@/components/audit/audit-log-table';
import { AuditFilters, type AuditFilters as AuditFiltersType } from '@/components/audit/audit-filters';
import { AuditDetailDrawer } from '@/components/audit/audit-detail-drawer';
import { AuditStats } from '@/components/audit/audit-stats';

// Types
interface AuditLogResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface StatsResponse {
  totalLogs: number;
  successfulActions: number;
  failedActions: number;
  uniqueUsers: number;
  byAction: Record<string, number>;
  byEntityType: Record<string, number>;
  byStatus: Record<string, number>;
  topUsers: Array<{
    id: string;
    name: string | null;
    email: string;
    avatarUrl?: string | null;
    count: number;
  }>;
}

export default function AuditLogsPage() {
  // State
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [relatedLogs, setRelatedLogs] = useState<AuditLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<AuditFiltersType>({});
  const [viewMode, setViewMode] = useState<'list' | 'stats'>('list');
  const [sortField, setSortField] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Fetch audit logs
  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '50');
      params.set('sortBy', sortField);
      params.set('sortOrder', sortOrder);

      if (filters.startDate) {
        params.set('startDate', filters.startDate.toISOString());
      }
      if (filters.endDate) {
        params.set('endDate', filters.endDate.toISOString());
      }
      if (filters.action) {
        params.set('action', filters.action);
      }
      if (filters.entityType) {
        params.set('entityType', filters.entityType);
      }
      if (filters.profileId) {
        params.set('profileId', filters.profileId);
      }
      if (filters.status) {
        params.set('status', filters.status);
      }
      if (filters.search) {
        params.set('search', filters.search);
      }
      if (filters.ipAddress) {
        params.set('ipAddress', filters.ipAddress);
      }

      const response = await fetch(`/api/audit-logs?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch audit logs');

      const data: AuditLogResponse = await response.json();
      setLogs(data.logs);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast.error('Erreur lors du chargement des logs');
    } finally {
      setIsLoading(false);
    }
  }, [page, filters, sortField, sortOrder]);

  // Fetch statistics
  const fetchStats = useCallback(async () => {
    setIsStatsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('stats', 'true');
      params.set('days', '30');

      if (filters.startDate) {
        params.set('startDate', filters.startDate.toISOString());
      }
      if (filters.endDate) {
        params.set('endDate', filters.endDate.toISOString());
      }

      const response = await fetch(`/api/audit-logs?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch stats');

      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsStatsLoading(false);
    }
  }, [filters.startDate, filters.endDate]);

  // Fetch related logs for a specific log
  const fetchRelatedLogs = async (log: AuditLog) => {
    if (!log.entityType || !log.entityId) {
      setRelatedLogs([]);
      return;
    }

    try {
      const params = new URLSearchParams();
      params.set('entityType', log.entityType);
      params.set('entityId', log.entityId);
      params.set('limit', '10');

      const response = await fetch(`/api/audit-logs?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch related logs');

      const data = await response.json();
      setRelatedLogs(data.logs.filter((l: AuditLog) => l.id !== log.id));
    } catch (error) {
      console.error('Error fetching related logs:', error);
      setRelatedLogs([]);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [fetchLogs, fetchStats]);

  // Handle filter change
  const handleFiltersChange = (newFilters: AuditFiltersType) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page when filters change
  };

  // Handle reset filters
  const handleResetFilters = () => {
    setFilters({});
    setPage(1);
  };

  // Handle sort
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Handle view details
  const handleViewDetails = async (log: AuditLog) => {
    setSelectedLog(log);
    setIsDrawerOpen(true);
    await fetchRelatedLogs(log);
  };

  // Handle export
  const handleExport = async (format: 'csv' | 'json' | 'pdf') => {
    try {
      const params = new URLSearchParams();
      params.set('format', format);

      if (filters.startDate) {
        params.set('startDate', filters.startDate.toISOString());
      }
      if (filters.endDate) {
        params.set('endDate', filters.endDate.toISOString());
      }
      if (filters.action) {
        params.set('action', filters.action);
      }
      if (filters.entityType) {
        params.set('entityType', filters.entityType);
      }
      if (filters.status) {
        params.set('status', filters.status);
      }

      const response = await fetch(`/api/audit-logs/export?${params.toString()}`);
      if (!response.ok) throw new Error('Export failed');

      const content = await response.text();
      const mimeType = format === 'json' ? 'application/json' : 
                       format === 'pdf' ? 'text/html' : 'text/csv';
      const extension = format === 'json' ? 'json' : 
                        format === 'pdf' ? 'html' : 'csv';

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Export réussi');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Erreur lors de l\'export');
    }
  };

  // Generate report
  const handleGenerateReport = async () => {
    try {
      const params = new URLSearchParams();
      params.set('report', 'true');

      if (filters.startDate) {
        params.set('startDate', filters.startDate.toISOString());
      }
      if (filters.endDate) {
        params.set('endDate', filters.endDate.toISOString());
      }

      const response = await fetch(`/api/audit-logs/export?${params.toString()}`);
      if (!response.ok) throw new Error('Report generation failed');

      const report = await response.json();
      
      // Download as JSON
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-report-${format(new Date(), 'yyyy-MM-dd')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Rapport généré');
    } catch (error) {
      console.error('Report error:', error);
      toast.error('Erreur lors de la génération du rapport');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Journal d'audit</h1>
          <p className="text-muted-foreground">
            Consultez l'historique complet des actions effectuées sur la plateforme
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { fetchLogs(); fetchStats(); }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exporter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('json')}>
                <FileJson className="h-4 w-4 mr-2" />
                Export JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                <FileText className="h-4 w-4 mr-2" />
                Export PDF
              </DropdownMenuItem>
              <Separator className="my-1" />
              <DropdownMenuItem onClick={handleGenerateReport}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Générer un rapport
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <AuditFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onReset={handleResetFilters}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      {/* View mode tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'stats')}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="list" className="gap-2">
              <List className="h-4 w-4" />
              Liste
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Statistiques
            </TabsTrigger>
          </TabsList>

          {viewMode === 'list' && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {total.toLocaleString()} log{total > 1 ? 's' : ''}
              </Badge>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Précédent
                  </Button>
                  <span className="text-sm text-muted-foreground px-2">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    Suivant
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <TabsContent value="list" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <AuditLogTable
                logs={logs}
                isLoading={isLoading}
                onViewDetails={handleViewDetails}
                onSort={handleSort}
                sortField={sortField}
                sortOrder={sortOrder}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="mt-4">
          <AuditStats stats={stats} isLoading={isStatsLoading} />
        </TabsContent>
      </Tabs>

      {/* Detail drawer */}
      <AuditDetailDrawer
        log={selectedLog}
        relatedLogs={relatedLogs}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedLog(null);
          setRelatedLogs([]);
        }}
      />
    </div>
  );
}
