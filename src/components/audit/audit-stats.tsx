'use client';

/**
 * Audit Statistics Component
 * Displays activity charts and statistics for audit logs
 */

import { useMemo } from 'react';
import { format, subDays, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Activity,
  Users,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
} from 'recharts';
import { cn } from '@/lib/utils';

// Types
interface AuditStats {
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

interface AuditStatsProps {
  stats: AuditStats | null;
  timeline?: Array<{
    date: string;
    total: number;
    success: number;
    failed: number;
  }>;
  isLoading?: boolean;
}

// Colors for charts
const CHART_COLORS = {
  primary: '#10b981',
  success: '#22c55e',
  failed: '#ef4444',
  pending: '#f59e0b',
  blue: '#3b82f6',
  purple: '#8b5cf6',
  pink: '#ec4899',
  orange: '#f97316',
  teal: '#14b8a6',
  cyan: '#06b6d4',
};

const PIE_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#6366f1',
];

// Action labels
const ACTION_LABELS: Record<string, string> = {
  'auth.login': 'Connexion',
  'auth.logout': 'Déconnexion',
  'client.created': 'Client créé',
  'client.updated': 'Client modifié',
  'debt.created': 'Créance créée',
  'reminder.sent': 'Relance envoyée',
  'payment.completed': 'Paiement',
};

const ENTITY_LABELS: Record<string, string> = {
  profile: 'Utilisateur',
  client: 'Client',
  debt: 'Créance',
  reminder: 'Relance',
  payment: 'Paiement',
  settings: 'Paramètres',
};

// Chart configs
const activityChartConfig = {
  total: { label: 'Total', color: CHART_COLORS.primary },
  success: { label: 'Succès', color: CHART_COLORS.success },
  failed: { label: 'Échecs', color: CHART_COLORS.failed },
} satisfies ChartConfig;

const actionChartConfig = {
  count: { label: 'Actions', color: CHART_COLORS.primary },
} satisfies ChartConfig;

export function AuditStats({ stats, timeline, isLoading }: AuditStatsProps) {
  // Prepare timeline data for chart
  const timelineData = useMemo(() => {
    if (!timeline) return [];
    return timeline.map((item) => ({
      ...item,
      date: format(new Date(item.date), 'dd MMM', { locale: fr }),
    }));
  }, [timeline]);

  // Prepare action breakdown data
  const actionData = useMemo(() => {
    if (!stats?.byAction) return [];
    return Object.entries(stats.byAction)
      .map(([action, count]) => ({
        action: ACTION_LABELS[action] || action,
        count,
        rawAction: action,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [stats]);

  // Prepare entity type data for pie chart
  const entityData = useMemo(() => {
    if (!stats?.byEntityType) return [];
    return Object.entries(stats.byEntityType)
      .map(([entityType, count], index) => ({
        name: ENTITY_LABELS[entityType] || entityType,
        value: count,
        color: PIE_COLORS[index % PIE_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [stats]);

  // Calculate success rate
  const successRate = useMemo(() => {
    if (!stats?.totalLogs) return 0;
    return Math.round((stats.successfulActions / stats.totalLogs) * 100);
  }, [stats]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Aucune statistique disponible</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total actions */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <Activity className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalLogs.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Actions totales</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Success rate */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-bold">{successRate}%</p>
                  {successRate >= 95 ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-amber-500" />
                  )}
                </div>
                <Progress value={successRate} className="h-1 mt-2" />
                <p className="text-xs text-muted-foreground mt-1">Taux de succès</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Failed actions */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.failedActions.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Échecs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active users */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.uniqueUsers}</p>
                <p className="text-sm text-muted-foreground">Utilisateurs actifs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity timeline */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Activité récente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {timelineData.length > 0 ? (
              <ChartContainer config={activityChartConfig} className="h-[250px]">
                <AreaChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stackId="1"
                    stroke={CHART_COLORS.primary}
                    fill={CHART_COLORS.primary}
                    fillOpacity={0.2}
                  />
                  <Area
                    type="monotone"
                    dataKey="success"
                    stackId="2"
                    stroke={CHART_COLORS.success}
                    fill={CHART_COLORS.success}
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Aucune donnée
              </div>
            )}
          </CardContent>
        </Card>

        {/* Entity distribution pie chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Par type d'entité
            </CardTitle>
          </CardHeader>
          <CardContent>
            {entityData.length > 0 ? (
              <ChartContainer config={actionChartConfig} className="h-[250px]">
                <PieChart>
                  <Pie
                    data={entityData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {entityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Aucune donnée
              </div>
            )}
            {/* Legend */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              {entityData.slice(0, 6).map((item) => (
                <div key={item.name} className="flex items-center gap-2 text-xs">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="truncate">{item.name}</span>
                  <span className="text-muted-foreground ml-auto">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Actions breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Actions les plus fréquentes</CardTitle>
          </CardHeader>
          <CardContent>
            {actionData.length > 0 ? (
              <ChartContainer config={actionChartConfig} className="h-[200px]">
                <BarChart data={actionData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="action" type="category" className="text-xs" width={100} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                Aucune donnée
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top users */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Utilisateurs les plus actifs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topUsers.length > 0 ? (
              <ScrollArea className="h-[200px]">
                <div className="space-y-3">
                  {stats.topUsers.map((user, index) => (
                    <div key={user.id} className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-medium">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{user.name || user.email}</div>
                        <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                      </div>
                      <Badge variant="secondary">{user.count}</Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                Aucune donnée
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
