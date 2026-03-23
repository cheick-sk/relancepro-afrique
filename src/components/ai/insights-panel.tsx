// Composant Panneau des Insights - RelancePro Africa
// Affiche les insights IA avec filtres et actions

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  RefreshCw,
  Filter,
  Check,
  X
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

// Types
export interface AIInsight {
  id: string;
  type: 'prediction' | 'anomaly' | 'opportunity' | 'warning';
  title: string;
  description: string;
  entityType?: string;
  entityId?: string;
  severity: 'low' | 'medium' | 'high';
  isRead: boolean;
  isActioned: boolean;
  createdAt: Date | string;
  metadata?: string;
}

export interface InsightsPanelProps {
  insights: AIInsight[];
  onMarkAsRead?: (id: string) => void;
  onMarkAsActioned?: (id: string) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  className?: string;
  maxHeight?: string;
}

// Icons by type
const typeIcons = {
  prediction: TrendingUp,
  anomaly: AlertTriangle,
  opportunity: Lightbulb,
  warning: AlertCircle
};

// Colors by type
const typeColors = {
  prediction: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-300 dark:border-blue-800'
  },
  anomaly: {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-700 dark:text-orange-400',
    border: 'border-orange-300 dark:border-orange-800'
  },
  opportunity: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-400',
    border: 'border-green-300 dark:border-green-800'
  },
  warning: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-400',
    border: 'border-red-300 dark:border-red-800'
  }
};

// Colors by severity
const severityColors = {
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
};

// Type labels
const typeLabels = {
  prediction: 'Prédiction',
  anomaly: 'Anomalie',
  opportunity: 'Opportunité',
  warning: 'Alerte'
};

// Single insight card
function InsightCard({
  insight,
  onMarkAsRead,
  onMarkAsActioned
}: {
  insight: AIInsight;
  onMarkAsRead?: (id: string) => void;
  onMarkAsActioned?: (id: string) => void;
}) {
  const Icon = typeIcons[insight.type];
  const colors = typeColors[insight.type];
  const createdAt = typeof insight.createdAt === 'string' 
    ? new Date(insight.createdAt) 
    : insight.createdAt;

  return (
    <Card className={cn(
      'transition-all hover:shadow-md',
      !insight.isRead && 'ring-1 ring-primary/20'
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn(
            'p-2 rounded-lg',
            colors.bg
          )}>
            <Icon className={cn('h-4 w-4', colors.text)} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h4 className="font-medium text-sm truncate">{insight.title}</h4>
              <Badge 
                variant="outline" 
                className={cn('text-xs shrink-0', severityColors[insight.severity])}
              >
                {insight.severity === 'high' ? 'Élevé' 
                 : insight.severity === 'medium' ? 'Moyen' 
                 : 'Faible'}
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
              {insight.description}
            </p>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>
                  {formatDistanceToNow(createdAt, { addSuffix: true, locale: fr })}
                </span>
                <Badge variant="outline" className={cn('text-xs', colors.bg, colors.text, colors.border)}>
                  {typeLabels[insight.type]}
                </Badge>
              </div>
              
              <div className="flex items-center gap-1">
                {!insight.isRead && onMarkAsRead && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => onMarkAsRead(insight.id)}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Lu
                  </Button>
                )}
                
                {!insight.isActioned && onMarkAsActioned && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => onMarkAsActioned(insight.id)}
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Traité
                  </Button>
                )}
                
                {insight.entityType && insight.entityId && (
                  <Link 
                    href={`/${insight.entityType.toLowerCase()}s/${insight.entityId}`}
                    className="text-primary hover:underline text-xs flex items-center gap-1"
                  >
                    Voir <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Empty state
function EmptyState({ type }: { type?: string }) {
  const messages: Record<string, string> = {
    prediction: 'Aucune prédiction disponible',
    anomaly: 'Aucune anomalie détectée',
    opportunity: 'Aucune opportunité identifiée',
    warning: 'Aucune alerte active'
  };

  return (
    <div className="text-center py-8 text-muted-foreground">
      <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
      <p className="text-sm">
        {type ? messages[type] : 'Aucun insight disponible'}
      </p>
    </div>
  );
}

// Main component
export function InsightsPanel({
  insights,
  onMarkAsRead,
  onMarkAsActioned,
  onRefresh,
  isLoading = false,
  className,
  maxHeight = '500px'
}: InsightsPanelProps) {
  const [filter, setFilter] = useState<'all' | AIInsight['type']>('all');
  const [showRead, setShowRead] = useState(true);

  // Filter insights
  const filteredInsights = insights.filter(insight => {
    if (filter !== 'all' && insight.type !== filter) return false;
    if (!showRead && insight.isRead) return false;
    return true;
  });

  // Group by type for tabs
  const groupedInsights = {
    all: filteredInsights,
    prediction: filteredInsights.filter(i => i.type === 'prediction'),
    anomaly: filteredInsights.filter(i => i.type === 'anomaly'),
    opportunity: filteredInsights.filter(i => i.type === 'opportunity'),
    warning: filteredInsights.filter(i => i.type === 'warning')
  };

  // Count unread
  const unreadCount = insights.filter(i => !i.isRead).length;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            Insights IA
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount} nouveau{unreadCount > 1 ? 'x' : ''}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRead(!showRead)}
              className="text-xs"
            >
              {showRead ? 'Masquer lus' : 'Afficher tout'}
            </Button>
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
              >
                <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="all" className="text-xs">
              Tout ({filteredInsights.length})
            </TabsTrigger>
            <TabsTrigger value="prediction" className="text-xs">
              Prédictions ({groupedInsights.prediction.length})
            </TabsTrigger>
            <TabsTrigger value="anomaly" className="text-xs">
              Anomalies ({groupedInsights.anomaly.length})
            </TabsTrigger>
            <TabsTrigger value="opportunity" className="text-xs">
              Opportunités ({groupedInsights.opportunity.length})
            </TabsTrigger>
            <TabsTrigger value="warning" className="text-xs">
              Alertes ({groupedInsights.warning.length})
            </TabsTrigger>
          </TabsList>

          {(['all', 'prediction', 'anomaly', 'opportunity', 'warning'] as const).map(type => (
            <TabsContent key={type} value={type} className="mt-0">
              <ScrollArea style={{ height: maxHeight }}>
                <div className="space-y-3 pr-4">
                  {groupedInsights[type].length > 0 ? (
                    groupedInsights[type].map(insight => (
                      <InsightCard
                        key={insight.id}
                        insight={insight}
                        onMarkAsRead={onMarkAsRead}
                        onMarkAsActioned={onMarkAsActioned}
                      />
                    ))
                  ) : (
                    <EmptyState type={type === 'all' ? undefined : type} />
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Compact version for sidebar
export function InsightsPanelCompact({
  insights,
  onMarkAsRead,
  className
}: InsightsPanelProps) {
  const unreadInsights = insights.filter(i => !i.isRead).slice(0, 5);

  if (unreadInsights.length === 0) {
    return (
      <div className={cn('text-center py-4 text-muted-foreground text-sm', className)}>
        <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Aucun nouvel insight</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {unreadInsights.map(insight => {
        const Icon = typeIcons[insight.type];
        const colors = typeColors[insight.type];
        
        return (
          <div
            key={insight.id}
            className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
            onClick={() => onMarkAsRead?.(insight.id)}
          >
            <Icon className={cn('h-4 w-4 mt-0.5', colors.text)} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{insight.title}</p>
              <p className="text-xs text-muted-foreground truncate">
                {insight.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default InsightsPanel;
