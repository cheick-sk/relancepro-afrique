// Composant Indicateur de Risque - RelancePro Africa
// Affiche le score de risque client avec jauge visuelle

'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Shield, AlertTriangle, AlertCircle, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface RiskMeterProps {
  score: number | null;
  level?: RiskLevel;
  trend?: 'improving' | 'stable' | 'worsening';
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Helper to get risk level from score
function getRiskLevelFromScore(score: number): RiskLevel {
  if (score >= 70) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
}

// Helper to get color classes
function getRiskColorClasses(level: RiskLevel) {
  switch (level) {
    case 'low':
      return {
        bg: 'bg-green-100 dark:bg-green-900/30',
        text: 'text-green-700 dark:text-green-400',
        border: 'border-green-300 dark:border-green-800',
        progress: 'bg-green-500',
        icon: CheckCircle
      };
    case 'medium':
      return {
        bg: 'bg-yellow-100 dark:bg-yellow-900/30',
        text: 'text-yellow-700 dark:text-yellow-400',
        border: 'border-yellow-300 dark:border-yellow-800',
        progress: 'bg-yellow-500',
        icon: AlertTriangle
      };
    case 'high':
      return {
        bg: 'bg-orange-100 dark:bg-orange-900/30',
        text: 'text-orange-700 dark:text-orange-400',
        border: 'border-orange-300 dark:border-orange-800',
        progress: 'bg-orange-500',
        icon: AlertTriangle
      };
    case 'critical':
      return {
        bg: 'bg-red-100 dark:bg-red-900/30',
        text: 'text-red-700 dark:text-red-400',
        border: 'border-red-300 dark:border-red-800',
        progress: 'bg-red-500',
        icon: AlertCircle
      };
  }
}

// Labels for risk levels
const riskLabels: Record<RiskLevel, string> = {
  low: 'Risque faible',
  medium: 'Risque modéré',
  high: 'Risque élevé',
  critical: 'Risque critique'
};

// Small inline version
export function RiskMeterInline({
  score,
  level,
  showLabel = true,
  className
}: RiskMeterProps) {
  if (score === null || score === undefined) {
    return (
      <span className={cn('text-muted-foreground text-sm', className)}>
        Non évalué
      </span>
    );
  }

  const riskLevel = level || getRiskLevelFromScore(score);
  const colors = getRiskColorClasses(riskLevel);
  const Icon = colors.icon;

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <Icon className={cn('h-4 w-4', colors.text)} />
      <span className={cn('font-medium text-sm', colors.text)}>
        {score}
      </span>
      {showLabel && (
        <span className="text-sm text-muted-foreground">
          ({riskLabels[riskLevel]})
        </span>
      )}
    </div>
  );
}

// Badge version
export function RiskMeterBadge({
  score,
  level,
  trend,
  showLabel = true,
  size = 'md',
  className
}: RiskMeterProps) {
  if (score === null || score === undefined) {
    return (
      <Badge variant="outline" className={cn('gap-1', className)}>
        <Shield className="h-3 w-3" />
        <span>Non évalué</span>
      </Badge>
    );
  }

  const riskLevel = level || getRiskLevelFromScore(score);
  const colors = getRiskColorClasses(riskLevel);
  const Icon = colors.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={cn(
              'gap-1.5 font-medium cursor-help',
              colors.bg, colors.text, colors.border,
              sizeClasses[size],
              className
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{score}</span>
            {showLabel && (
              <span className="hidden sm:inline">{riskLabels[riskLevel]}</span>
            )}
            {trend && (
              trend === 'improving' ? <TrendingDown className="h-3 w-3 ml-0.5" />
              : trend === 'worsening' ? <TrendingUp className="h-3 w-3 ml-0.5" />
              : null
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{riskLabels[riskLevel]}</p>
          <p className="text-xs text-muted-foreground">
            Score: {score}/100
            {trend && ` • Tendance: ${
              trend === 'improving' ? 'En amélioration' 
              : trend === 'worsening' ? 'En dégradation' 
              : 'Stable'
            }`}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Full meter with progress bar
export function RiskMeter({
  score,
  level,
  trend,
  showLabel = true,
  size = 'md',
  className
}: RiskMeterProps) {
  const riskLevel = useMemo(() => {
    if (score === null || score === undefined) return null;
    return level || getRiskLevelFromScore(score);
  }, [score, level]);

  const colors = useMemo(() => {
    return riskLevel ? getRiskColorClasses(riskLevel) : null;
  }, [riskLevel]);

  if (score === null || score === undefined || !riskLevel || !colors) {
    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Score de risque</span>
          <span className="text-sm text-muted-foreground">Non évalué</span>
        </div>
        <Progress value={0} className="h-2" />
      </div>
    );
  }

  const Icon = colors.icon;

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3'
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className={cn('h-4 w-4', colors.text)} />
          <span className="text-sm font-medium">Score de risque</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('font-bold', colors.text)}>{score}</span>
          {showLabel && (
            <Badge 
              variant="outline" 
              className={cn('text-xs', colors.bg, colors.text, colors.border)}
            >
              {riskLabels[riskLevel]}
            </Badge>
          )}
          {trend && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  {trend === 'improving' ? (
                    <TrendingDown className="h-4 w-4 text-green-500" />
                  ) : trend === 'worsening' ? (
                    <TrendingUp className="h-4 w-4 text-red-500" />
                  ) : null}
                </TooltipTrigger>
                <TooltipContent>
                  {trend === 'improving' ? 'Situation en amélioration'
                   : trend === 'worsening' ? 'Situation en dégradation'
                   : 'Situation stable'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
      <div className="relative">
        <Progress 
          value={score} 
          className={cn(heightClasses[size])}
        />
        <div 
          className={cn(
            'absolute top-0 left-0 h-full rounded-full transition-all',
            colors.progress,
            heightClasses[size]
          )}
          style={{ width: `${score}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0 - Faible</span>
        <span>25 - Modéré</span>
        <span>50 - Élevé</span>
        <span>70+ - Critique</span>
      </div>
    </div>
  );
}

// Card version for dashboards
export function RiskMeterCard({
  score,
  level,
  trend,
  recommendations,
  className
}: RiskMeterProps & { recommendations?: string[] }) {
  const riskLevel = score !== null ? (level || getRiskLevelFromScore(score)) : null;
  const colors = riskLevel ? getRiskColorClasses(riskLevel) : null;

  if (score === null || score === undefined || !riskLevel || !colors) {
    return (
      <Card className={cn('p-4', className)}>
        <CardContent className="p-0">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-medium">Risque non évalué</p>
              <p className="text-sm text-muted-foreground">
                Lancez une analyse pour évaluer le risque
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const Icon = colors.icon;

  return (
    <Card className={cn('overflow-hidden', className)}>
      <div className={cn('h-1', colors.progress)} />
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon className={cn('h-5 w-5', colors.text)} />
            <span className="font-medium">{riskLabels[riskLevel]}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn('text-2xl font-bold', colors.text)}>
              {score}
            </span>
            {trend && (
              trend === 'improving' ? <TrendingDown className="h-4 w-4 text-green-500" />
              : trend === 'worsening' ? <TrendingUp className="h-4 w-4 text-red-500" />
              : null
            )}
          </div>
        </div>
        
        <div className="mb-3">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn('h-full rounded-full transition-all', colors.progress)}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>

        {recommendations && recommendations.length > 0 && (
          <div className="pt-3 border-t">
            <p className="text-xs font-medium mb-2">Recommandations:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              {recommendations.slice(0, 2).map((rec, i) => (
                <li key={i} className="flex items-start gap-1">
                  <span className="text-primary">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default RiskMeter;
