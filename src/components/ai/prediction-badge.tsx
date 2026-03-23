// Composant Badge de Prédiction - RelancePro Africa
// Affiche la probabilité de paiement avec indicateur visuel

'use client';

import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, HelpCircle } from 'lucide-react';

export interface PredictionFactor {
  name: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number;
  description: string;
}

export interface PredictionBadgeProps {
  probability: number | null;
  confidence?: 'low' | 'medium' | 'high';
  factors?: PredictionFactor[];
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function PredictionBadge({
  probability,
  confidence = 'medium',
  factors = [],
  showLabel = true,
  size = 'md',
  className
}: PredictionBadgeProps) {
  // Handle null/undefined probability
  if (probability === null || probability === undefined) {
    return (
      <Badge variant="outline" className={cn('gap-1', className)}>
        <HelpCircle className="h-3 w-3" />
        {showLabel && <span>Non calculé</span>}
      </Badge>
    );
  }

  // Determine color based on probability
  const getColorClass = () => {
    if (probability >= 70) return 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
    if (probability >= 40) return 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800';
    return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
  };

  // Determine trend icon
  const getTrendIcon = () => {
    if (probability >= 60) return <TrendingUp className="h-3 w-3" />;
    if (probability <= 30) return <TrendingDown className="h-3 w-3" />;
    return <Minus className="h-3 w-3" />;
  };

  // Size classes
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  const label = probability >= 70 
    ? 'Probabilité élevée' 
    : probability >= 40 
    ? 'Probabilité moyenne' 
    : 'Probabilité faible';

  // If no factors, show simple badge
  if (factors.length === 0) {
    return (
      <Badge 
        variant="outline" 
        className={cn('gap-1 font-medium', getColorClass(), sizeClasses[size], className)}
      >
        {getTrendIcon()}
        <span>{probability.toFixed(0)}%</span>
        {showLabel && <span className="hidden sm:inline">- {label}</span>}
      </Badge>
    );
  }

  // With factors, show tooltip
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={cn('gap-1 cursor-help font-medium', getColorClass(), sizeClasses[size], className)}
          >
            {getTrendIcon()}
            <span>{probability.toFixed(0)}%</span>
            {showLabel && <span className="hidden sm:inline">- {label}</span>}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-sm">
          <div className="space-y-2">
            <p className="font-medium text-sm">Facteurs d&apos;influence</p>
            <div className="space-y-1.5">
              {factors.slice(0, 5).map((factor, index) => (
                <div key={index} className="flex items-start gap-2 text-xs">
                  <span className={cn(
                    'mt-0.5 h-2 w-2 rounded-full flex-shrink-0',
                    factor.impact === 'positive' && 'bg-green-500',
                    factor.impact === 'negative' && 'bg-red-500',
                    factor.impact === 'neutral' && 'bg-gray-400'
                  )} />
                  <div>
                    <span className="font-medium">{factor.name}</span>
                    <p className="text-muted-foreground">{factor.description}</p>
                  </div>
                </div>
              ))}
            </div>
            {confidence !== 'high' && (
              <p className="text-xs text-muted-foreground pt-1 border-t">
                Confiance: {confidence === 'medium' ? 'Moyenne' : 'Faible'}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Compact version for table cells
export function PredictionBadgeCompact({
  probability,
  className
}: { probability: number | null; className?: string }) {
  if (probability === null || probability === undefined) {
    return (
      <span className={cn('text-muted-foreground text-sm', className)}>
        --
      </span>
    );
  }

  const colorClass = probability >= 70 
    ? 'text-green-600 dark:text-green-400'
    : probability >= 40 
    ? 'text-yellow-600 dark:text-yellow-400'
    : 'text-red-600 dark:text-red-400';

  return (
    <span className={cn('font-medium', colorClass, className)}>
      {probability.toFixed(0)}%
    </span>
  );
}

// Large display for dashboards
export function PredictionBadgeLarge({
  probability,
  factors = [],
  confidence = 'medium',
  className
}: PredictionBadgeProps) {
  if (probability === null || probability === undefined) {
    return (
      <div className={cn('text-center p-4', className)}>
        <HelpCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">Prédiction non disponible</p>
      </div>
    );
  }

  const getColorClass = () => {
    if (probability >= 70) return 'text-green-600 dark:text-green-400';
    if (probability >= 40) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getBgClass = () => {
    if (probability >= 70) return 'bg-green-50 dark:bg-green-900/20';
    if (probability >= 40) return 'bg-yellow-50 dark:bg-yellow-900/20';
    return 'bg-red-50 dark:bg-red-900/20';
  };

  return (
    <div className={cn('text-center p-4 rounded-lg', getBgClass(), className)}>
      <div className={cn('text-4xl font-bold', getColorClass())}>
        {probability.toFixed(0)}%
      </div>
      <p className="text-sm text-muted-foreground mt-1">
        Probabilité de paiement
      </p>
      {confidence !== 'high' && (
        <Badge variant="outline" className="mt-2 text-xs">
          Confiance: {confidence === 'medium' ? 'Moyenne' : 'Faible'}
        </Badge>
      )}
      {factors.length > 0 && (
        <div className="mt-3 pt-3 border-t text-left">
          <p className="text-xs font-medium mb-2">Facteurs:</p>
          <div className="space-y-1">
            {factors.slice(0, 3).map((factor, index) => (
              <div key={index} className="flex items-center gap-1.5 text-xs">
                <span className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  factor.impact === 'positive' && 'bg-green-500',
                  factor.impact === 'negative' && 'bg-red-500',
                  factor.impact === 'neutral' && 'bg-gray-400'
                )} />
                <span className="truncate">{factor.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default PredictionBadge;
