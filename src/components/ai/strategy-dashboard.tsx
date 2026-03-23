// Composant Tableau de Bord Stratégie - RelancePro Africa
// Affiche la stratégie de recouvrement avec actions prioritaires

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { formatCurrencyAmount } from '@/lib/config';
import {
  Target,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  MessageSquare,
  Scale,
  ArrowUpRight,
  RefreshCw,
  ChevronRight,
  Calendar,
  Users,
  DollarSign
} from 'lucide-react';
import Link from 'next/link';

// Types
export interface CollectionAction {
  order: number;
  type: 'reminder' | 'call' | 'visit' | 'legal' | 'negotiation' | 'escalation';
  channel?: 'email' | 'whatsapp' | 'sms';
  description: string;
  timing: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  debtId?: string;
  clientId?: string;
  expectedOutcome: string;
  estimatedCost?: number;
}

export interface CollectionStrategy {
  id: string;
  name: string;
  description: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  actions: CollectionAction[];
  expectedRecovery: number;
  estimatedTimeframe: string;
  successProbability: number;
  totalDebt: number;
  debtCount: number;
}

export interface StrategyDashboardProps {
  strategy: CollectionStrategy | null;
  summary?: {
    totalDebts: number;
    overdueDebts: number;
    criticalDebts: number;
    totalAmount: number;
    expectedRecovery: number;
  };
  onRefresh?: () => void;
  onExecuteAction?: (action: CollectionAction) => void;
  isLoading?: boolean;
  className?: string;
}

// Priority colors
const priorityColors = {
  urgent: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-400',
    border: 'border-red-300 dark:border-red-800'
  },
  high: {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-700 dark:text-orange-400',
    border: 'border-orange-300 dark:border-orange-800'
  },
  medium: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    text: 'text-yellow-700 dark:text-yellow-400',
    border: 'border-yellow-300 dark:border-yellow-800'
  },
  low: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-400',
    border: 'border-green-300 dark:border-green-800'
  }
};

// Action type icons
const actionIcons = {
  reminder: Mail,
  call: Phone,
  visit: Users,
  legal: Scale,
  negotiation: MessageSquare,
  escalation: ArrowUpRight
};

// Channel icons
const channelIcons = {
  email: Mail,
  whatsapp: MessageSquare,
  sms: Phone
};

// Action card
function ActionCard({
  action,
  onExecute
}: {
  action: CollectionAction;
  onExecute?: (action: CollectionAction) => void;
}) {
  const Icon = actionIcons[action.type];
  const colors = priorityColors[action.priority];
  const ChannelIcon = action.channel ? channelIcons[action.channel] : null;

  return (
    <div className={cn(
      'p-4 rounded-lg border',
      colors.bg, colors.border,
      'hover:shadow-md transition-shadow'
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          'p-2 rounded-lg bg-background/50',
        )}>
          <Icon className="h-5 w-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className={cn('text-xs', colors.text)}>
              {action.priority === 'urgent' ? 'Urgent'
               : action.priority === 'high' ? 'Haute'
               : action.priority === 'medium' ? 'Moyenne'
               : 'Basse'}
            </Badge>
            {ChannelIcon && (
              <ChannelIcon className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </div>
          
          <h4 className="font-medium text-sm mb-1">{action.description}</h4>
          
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {action.timing}
            </span>
            {action.estimatedCost && (
              <span>{formatCurrencyAmount(action.estimatedCost, 'GNF')}</span>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground mt-1">
            → {action.expectedOutcome}
          </p>
        </div>
        
        {onExecute && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onExecute(action)}
          >
            Exécuter
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}

// Stats card
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
                  'text-xs',
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
      </CardContent>
    </Card>
  );
}

// Main component
export function StrategyDashboard({
  strategy,
  summary,
  onRefresh,
  onExecuteAction,
  isLoading = false,
  className
}: StrategyDashboardProps) {
  const [expandedSection, setExpandedSection] = useState<string>('actions');

  if (!strategy) {
    return (
      <Card className={cn('p-8', className)}>
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-medium mb-2">Aucune stratégie générée</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Générez une stratégie de recouvrement basée sur vos créances
          </p>
          {onRefresh && (
            <Button onClick={onRefresh} disabled={isLoading}>
              <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
              Générer la stratégie
            </Button>
          )}
        </div>
      </Card>
    );
  }

  const recoveryRate = strategy.totalDebt > 0 
    ? (strategy.expectedRecovery / strategy.totalDebt) * 100 
    : 0;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                {strategy.name}
              </CardTitle>
              <CardDescription>{strategy.description}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={cn(
                priorityColors[strategy.priority].bg,
                priorityColors[strategy.priority].text
              )}>
                Priorité {strategy.priority === 'urgent' ? 'urgente'
                 : strategy.priority === 'high' ? 'haute'
                 : strategy.priority === 'medium' ? 'moyenne'
                 : 'basse'}
              </Badge>
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
          {/* Recovery progress */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span>Recouvrement estimé</span>
              <span className="font-medium">
                {formatCurrencyAmount(strategy.expectedRecovery, 'GNF')} / {formatCurrencyAmount(strategy.totalDebt, 'GNF')}
              </span>
            </div>
            <Progress value={recoveryRate} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{recoveryRate.toFixed(0)}% estimé</span>
              <span>Probabilité: {strategy.successProbability}%</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Total dû</p>
                <p className="font-medium text-sm">
                  {formatCurrencyAmount(strategy.totalDebt, 'GNF')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Récupération</p>
                <p className="font-medium text-sm">
                  {formatCurrencyAmount(strategy.expectedRecovery, 'GNF')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Délai estimé</p>
                <p className="font-medium text-sm">{strategy.estimatedTimeframe}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Créances</p>
                <p className="font-medium text-sm">{strategy.debtCount}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            Actions prioritaires
            <Badge variant="outline">{strategy.actions.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {summary && (
            <div className="grid grid-cols-3 gap-3 mb-4 pb-4 border-b">
              <StatCard
                title="Total créances"
                value={summary.totalDebts}
                icon={Users}
              />
              <StatCard
                title="En retard"
                value={summary.overdueDebts}
                subtitle={`${summary.criticalDebts} critiques`}
                icon={AlertCircle}
              />
              <StatCard
                title="Montant total"
                value={formatCurrencyAmount(summary.totalAmount, 'GNF')}
                icon={DollarSign}
              />
            </div>
          )}

          <ScrollArea className="h-[400px] pr-4">
            <Accordion type="single" value={expandedSection} onValueChange={setExpandedSection}>
              {/* Urgent actions */}
              <AccordionItem value="urgent">
                <AccordionTrigger className="text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    Actions urgentes
                    <Badge variant="destructive" className="text-xs">
                      {strategy.actions.filter(a => a.priority === 'urgent').length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    {strategy.actions
                      .filter(a => a.priority === 'urgent')
                      .map((action, i) => (
                        <ActionCard key={i} action={action} onExecute={onExecuteAction} />
                      ))}
                    {strategy.actions.filter(a => a.priority === 'urgent').length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Aucune action urgente
                      </p>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* High priority actions */}
              <AccordionItem value="high">
                <AccordionTrigger className="text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <ArrowUpRight className="h-4 w-4 text-orange-500" />
                    Priorité haute
                    <Badge variant="outline" className="text-xs bg-orange-100 text-orange-700">
                      {strategy.actions.filter(a => a.priority === 'high').length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    {strategy.actions
                      .filter(a => a.priority === 'high')
                      .map((action, i) => (
                        <ActionCard key={i} action={action} onExecute={onExecuteAction} />
                      ))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Medium priority actions */}
              <AccordionItem value="medium">
                <AccordionTrigger className="text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    Priorité moyenne
                    <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-700">
                      {strategy.actions.filter(a => a.priority === 'medium').length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    {strategy.actions
                      .filter(a => a.priority === 'medium')
                      .map((action, i) => (
                        <ActionCard key={i} action={action} onExecute={onExecuteAction} />
                      ))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Low priority actions */}
              <AccordionItem value="low">
                <AccordionTrigger className="text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Priorité basse
                    <Badge variant="outline" className="text-xs bg-green-100 text-green-700">
                      {strategy.actions.filter(a => a.priority === 'low').length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    {strategy.actions
                      .filter(a => a.priority === 'low')
                      .map((action, i) => (
                        <ActionCard key={i} action={action} onExecute={onExecuteAction} />
                      ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export default StrategyDashboard;
