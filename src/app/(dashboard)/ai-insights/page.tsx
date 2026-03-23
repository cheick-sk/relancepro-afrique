// Page Insights IA - RelancePro Africa
// Tableau de bord complet des prédictions, risques et stratégies

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { formatCurrencyAmount } from '@/lib/config';

import { PredictionBadge } from '@/components/ai/prediction-badge';
import { InsightsPanel, type AIInsight } from '@/components/ai/insights-panel';
import { StrategyDashboard, type CollectionStrategy } from '@/components/ai/strategy-dashboard';

import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Target,
  RefreshCw,
  Users,
  DollarSign,
  BarChart3,
  PieChart,
  Activity,
  Sparkles
} from 'lucide-react';

// Types
interface Prediction {
  debtId: string;
  reference: string | null;
  amount: number;
  paidAmount: number;
  clientName: string;
  probability: number;
  confidence: 'low' | 'medium' | 'high';
  factors: Array<{
    name: string;
    impact: 'positive' | 'negative' | 'neutral';
    description: string;
  }>;
  predictedDate: Date | string | null;
}

interface TrendData {
  payments: {
    current: number;
    previous: number;
    trend: number;
    direction: 'up' | 'down' | 'stable';
  };
  responseRate: {
    current: number;
    previous: number;
    trend: number;
    direction: 'up' | 'down' | 'stable';
  };
  overdue: {
    newOverdue: number;
    direction: 'up' | 'down' | 'stable';
  };
}

interface Opportunity {
  type: string;
  title: string;
  description: string;
  potentialAmount: number;
  action: string;
  debtIds?: string[];
}

interface Stats {
  totalClients: number;
  totalDebts: number;
  pendingDebts: number;
  overdueDebts: number;
  totalAmount: number;
  paidAmount: number;
  recoveryRate: string;
}

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Stat card component
function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'stable';
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{title}</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{value}</p>
                {trend && (
                  <span className={cn(
                    'text-xs font-medium',
                    trend === 'up' && 'text-green-500',
                    trend === 'down' && 'text-red-500'
                  )}>
                    {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
                  </span>
                )}
              </div>
              {subtitle && (
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Main page component
export default function AIInsightsPage() {
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week');
  
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [strategy, setStrategy] = useState<CollectionStrategy | null>(null);
  const [strategySummary, setStrategySummary] = useState<any>(null);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [trends, setTrends] = useState<TrendData | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  // Fetch all data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch predictions
      const predictRes = await fetch('/api/ai/predict?all=true');
      const predictData = await predictRes.json();
      if (predictData.predictions) {
        setPredictions(predictData.predictions);
      }

      // Fetch strategy
      const strategyRes = await fetch('/api/ai/strategy');
      const strategyData = await strategyRes.json();
      setStrategy(strategyData.strategy);
      setStrategySummary(strategyData.summary);

      // Fetch insights
      const insightsRes = await fetch(`/api/ai/insights?period=${period}`);
      const insightsData = await insightsRes.json();
      setInsights(insightsData.existingInsights || []);
      setTrends(insightsData.trends);
      setOpportunities(insightsData.opportunities || []);
      setAnomalies(insightsData.anomalies || []);
      setStats(insightsData.stats);

    } catch (error) {
      console.error('Error fetching AI data:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les données IA',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [period, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Mark insight as read
  const handleMarkAsRead = async (id: string) => {
    try {
      await fetch(`/api/ai/insights/${id}/read`, { method: 'POST' });
      setInsights(prev => 
        prev.map(i => i.id === id ? { ...i, isRead: true } : i)
      );
    } catch (error) {
      console.error('Error marking insight as read:', error);
    }
  };

  // Refresh predictions
  const handleRefreshPredictions = async () => {
    try {
      await fetch('/api/ai/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceRefresh: true })
      });
      await fetchData();
      toast({
        title: 'Prédictions mises à jour',
        description: 'Les prédictions ont été actualisées'
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour les prédictions',
        variant: 'destructive'
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            Insights IA
          </h1>
          <p className="text-muted-foreground">
            Tableau de bord intelligent pour le recouvrement
          </p>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            Insights IA
          </h1>
          <p className="text-muted-foreground">
            Prédictions, analyses de risque et stratégies de recouvrement
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Aujourd&apos;hui</SelectItem>
              <SelectItem value="week">Cette semaine</SelectItem>
              <SelectItem value="month">Ce mois</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Clients"
            value={stats.totalClients}
            icon={Users}
          />
          <StatCard
            title="Créances"
            value={stats.totalDebts}
            subtitle={`${stats.pendingDebts} en cours`}
            icon={BarChart3}
          />
          <StatCard
            title="Montant total"
            value={formatCurrencyAmount(stats.totalAmount, 'GNF')}
            icon={DollarSign}
          />
          <StatCard
            title="Taux recouvrement"
            value={`${stats.recoveryRate}%`}
            subtitle={formatCurrencyAmount(stats.paidAmount, 'GNF')}
            icon={TrendingUp}
            trend={trends?.payments.direction}
          />
        </div>
      )}

      {/* Main content */}
      <Tabs defaultValue="strategy" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="strategy" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Stratégie</span>
          </TabsTrigger>
          <TabsTrigger value="predictions" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Prédictions</span>
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Insights</span>
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            <span className="hidden sm:inline">Analyse</span>
          </TabsTrigger>
        </TabsList>

        {/* Strategy Tab */}
        <TabsContent value="strategy">
          <StrategyDashboard
            strategy={strategy}
            summary={strategySummary}
            onRefresh={handleRefreshPredictions}
            isLoading={isLoading}
          />
        </TabsContent>

        {/* Predictions Tab */}
        <TabsContent value="predictions">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Predictions list */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Prédictions de paiement</CardTitle>
                  <Button variant="outline" size="sm" onClick={handleRefreshPredictions}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Mettre à jour
                  </Button>
                </div>
                <CardDescription>
                  Probabilités de paiement basées sur l&apos;IA
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {predictions.length > 0 ? (
                    predictions.map((pred) => (
                      <div
                        key={pred.debtId}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <PredictionBadge
                            probability={pred.probability}
                            confidence={pred.confidence}
                            factors={pred.factors}
                            showLabel={false}
                            size="sm"
                          />
                          <div>
                            <p className="font-medium text-sm">{pred.clientName}</p>
                            <p className="text-xs text-muted-foreground">
                              {pred.reference || `Créance #${pred.debtId.slice(0, 6)}`}
                              {' • '}
                              {formatCurrencyAmount(pred.amount - pred.paidAmount, 'GNF')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {pred.predictedDate && (
                            <p className="text-xs text-muted-foreground">
                              Prévu: {new Date(pred.predictedDate).toLocaleDateString('fr-FR')}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>Aucune prédiction disponible</p>
                      <Button
                        variant="link"
                        onClick={handleRefreshPredictions}
                        className="mt-2"
                      >
                        Générer les prédictions
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick stats */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Répartition des probabilités</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-green-500" />
                      <span className="text-sm">Élevée (&gt;70%)</span>
                    </div>
                    <span className="font-medium">
                      {predictions.filter(p => p.probability >= 70).length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-yellow-500" />
                      <span className="text-sm">Moyenne (40-70%)</span>
                    </div>
                    <span className="font-medium">
                      {predictions.filter(p => p.probability >= 40 && p.probability < 70).length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-red-500" />
                      <span className="text-sm">Faible (&lt;40%)</span>
                    </div>
                    <span className="font-medium">
                      {predictions.filter(p => p.probability < 40).length}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Opportunities */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    Opportunités
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {opportunities.slice(0, 3).map((opp, i) => (
                      <div key={i} className="p-2 bg-muted/50 rounded-lg">
                        <p className="text-sm font-medium">{opp.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {opp.description}
                        </p>
                        {opp.potentialAmount > 0 && (
                          <p className="text-xs text-green-600 font-medium mt-1">
                            Potentiel: {formatCurrencyAmount(opp.potentialAmount, 'GNF')}
                          </p>
                        )}
                      </div>
                    ))}
                    {opportunities.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        Aucune opportunité identifiée
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights">
          <InsightsPanel
            insights={insights}
            onMarkAsRead={handleMarkAsRead}
            onRefresh={fetchData}
            isLoading={isLoading}
          />
        </TabsContent>

        {/* Analysis Tab */}
        <TabsContent value="analysis">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Tendances
                </CardTitle>
                <CardDescription>Évolution sur la période</CardDescription>
              </CardHeader>
              <CardContent>
                {trends ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">Paiements</p>
                        <p className="text-xs text-muted-foreground">
                          {trends.payments.current} cette période vs {trends.payments.previous} précédent
                        </p>
                      </div>
                      <Badge className={cn(
                        trends.payments.direction === 'up' && 'bg-green-100 text-green-700',
                        trends.payments.direction === 'down' && 'bg-red-100 text-red-700',
                        trends.payments.direction === 'stable' && 'bg-gray-100 text-gray-700'
                      )}>
                        {trends.payments.direction === 'up' ? '↑' 
                         : trends.payments.direction === 'down' ? '↓' 
                         : '→'} {Math.abs(trends.payments.trend).toFixed(0)}%
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">Taux de réponse</p>
                        <p className="text-xs text-muted-foreground">
                          {trends.responseRate.current.toFixed(0)}% actuel
                        </p>
                      </div>
                      <Badge className={cn(
                        trends.responseRate.direction === 'up' && 'bg-green-100 text-green-700',
                        trends.responseRate.direction === 'down' && 'bg-red-100 text-red-700'
                      )}>
                        {trends.responseRate.direction === 'up' ? '↑' 
                         : trends.responseRate.direction === 'down' ? '↓' 
                         : '→'} {Math.abs(trends.responseRate.trend).toFixed(0)}%
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">Nouveaux retards</p>
                        <p className="text-xs text-muted-foreground">
                          {trends.overdue.newOverdue} créances
                        </p>
                      </div>
                      <Badge className={cn(
                        trends.overdue.direction === 'up' && 'bg-red-100 text-red-700',
                        trends.overdue.direction === 'down' && 'bg-green-100 text-green-700'
                      )}>
                        {trends.overdue.direction === 'up' ? '↑' 
                         : trends.overdue.direction === 'down' ? '↓' 
                         : '→'}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Données insuffisantes pour les tendances
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Anomalies */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Anomalies détectées
                </CardTitle>
                <CardDescription>Comportements inhabituels</CardDescription>
              </CardHeader>
              <CardContent>
                {anomalies.length > 0 ? (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {anomalies.map((anomaly, i) => (
                      <div key={i} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-sm">{anomaly.clientName}</p>
                          <Badge variant="outline" className={cn(
                            anomaly.severity === 'high' && 'bg-red-100 text-red-700',
                            anomaly.severity === 'medium' && 'bg-yellow-100 text-yellow-700'
                          )}>
                            {anomaly.severity === 'high' ? 'Élevé' 
                             : anomaly.severity === 'medium' ? 'Moyen' 
                             : 'Faible'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {anomaly.description}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Aucune anomalie détectée</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
