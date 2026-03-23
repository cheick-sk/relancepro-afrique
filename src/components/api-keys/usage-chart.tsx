'use client'

import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Line,
  LineChart,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { Badge } from '@/components/ui/badge'
import { 
  Activity, 
  TrendingUp, 
  TrendingDown,
  Clock,
  Zap,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'

// =====================================================
// Types
// =====================================================

interface DailyStat {
  date: string
  count: number
}

interface EndpointStat {
  endpoint: string
  count: number
  avgResponseTime: number
}

interface UsageStats {
  totalRequests: number
  successRate: number
  avgResponseTime: number
  endpointStats: EndpointStat[]
  dailyStats: DailyStat[]
}

interface UsageChartProps {
  stats: UsageStats
  className?: string
}

// =====================================================
// Chart Config
// =====================================================

const chartConfig = {
  requests: {
    label: 'Requêtes',
    color: 'hsl(var(--chart-1))',
  },
  responseTime: {
    label: 'Temps de réponse (ms)',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
]

// =====================================================
// Component
// =====================================================

export function UsageChart({ stats, className }: UsageChartProps) {
  const formattedDailyStats = useMemo(() => {
    return stats.dailyStats.map(stat => ({
      ...stat,
      date: new Date(stat.date).toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: 'short' 
      }),
    }))
  }, [stats.dailyStats])
  
  const endpointPieData = useMemo(() => {
    return stats.endpointStats.slice(0, 5).map((stat, index) => ({
      name: stat.endpoint.replace('/api/v1/', ''),
      value: stat.count,
      color: COLORS[index % COLORS.length],
    }))
  }, [stats.endpointStats])
  
  const successRateColor = stats.successRate >= 95 
    ? 'text-green-600 dark:text-green-400' 
    : stats.successRate >= 80 
      ? 'text-yellow-600 dark:text-yellow-400'
      : 'text-red-600 dark:text-red-400'
  
  const responseTimeColor = stats.avgResponseTime <= 200
    ? 'text-green-600 dark:text-green-400'
    : stats.avgResponseTime <= 500
      ? 'text-yellow-600 dark:text-yellow-400'
      : 'text-red-600 dark:text-red-400'
  
  return (
    <div className={className}>
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total requêtes</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalRequests.toLocaleString('fr-FR')}
            </div>
            <p className="text-xs text-muted-foreground">
              Sur les 7 derniers jours
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de succès</CardTitle>
            {stats.successRate >= 95 ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={cn('text-2xl font-bold', successRateColor)}>
              {stats.successRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.successRate >= 95 ? 'Excellent' : stats.successRate >= 80 ? 'Bon' : 'À améliorer'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Temps moyen</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn('text-2xl font-bold', responseTimeColor)}>
              {Math.round(stats.avgResponseTime)}ms
            </div>
            <p className="text-xs text-muted-foreground">
              Temps de réponse
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Endpoints</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.endpointStats.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Endpoints utilisés
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Daily Requests Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Requêtes quotidiennes</CardTitle>
            <CardDescription>
              Nombre de requêtes par jour sur les 7 derniers jours
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px]">
              <BarChart data={formattedDailyStats}>
                <CartesianGrid vertical={false} />
                <XAxis 
                  dataKey="date" 
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                <YAxis 
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => value.toLocaleString('fr-FR')}
                />
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Bar 
                  dataKey="count" 
                  fill="var(--color-requests)" 
                  radius={[4, 4, 0, 0]}
                  name="Requêtes"
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        
        {/* Endpoint Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Répartition par endpoint</CardTitle>
            <CardDescription>
              Top 5 des endpoints les plus utilisés
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px]">
              <PieChart>
                <Pie
                  data={endpointPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {endpointPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [value.toLocaleString('fr-FR'), 'Requêtes']}
                />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
      
      {/* Endpoint Stats Table */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Détails par endpoint</CardTitle>
          <CardDescription>
            Statistiques détaillées pour chaque endpoint
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.endpointStats.map((stat, index) => (
              <div 
                key={stat.endpoint}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="font-mono text-sm">{stat.endpoint}</span>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant="secondary">
                    {stat.count.toLocaleString('fr-FR')} req
                  </Badge>
                  <Badge variant="outline">
                    {Math.round(stat.avgResponseTime)}ms
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Helper function (since cn is not imported)
function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

export default UsageChart
