'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Calendar, 
  User, 
  DollarSign,
  TrendingUp,
  Clock,
  ArrowRight,
  MoreHorizontal,
  FileText
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { StatusBadge, LitigationStatus } from './status-badge'
import { TypeBadge, LitigationType } from './type-badge'
import Link from 'next/link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface CaseCardProps {
  id: string
  reference: string
  status: LitigationStatus
  type: LitigationType
  stage: string
  amount: number
  amountRecovered: number
  currency: string
  clientName: string
  clientCompany?: string | null
  filedAt?: Date | null
  nextEvent?: {
    title: string
    date: Date
  } | null
  totalCosts?: number
}

const stageLabels: Record<string, string> = {
  initial: 'Initial',
  assigned: 'Assigné',
  hearing: 'Audience',
  judgment: 'Jugement',
  execution: 'Exécution'
}

const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('fr-GN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

export function CaseCard({
  id,
  reference,
  status,
  type,
  stage,
  amount,
  amountRecovered,
  currency,
  clientName,
  clientCompany,
  filedAt,
  nextEvent,
  totalCosts = 0
}: CaseCardProps) {
  const recoveryRate = amount > 0 ? (amountRecovered / amount) * 100 : 0
  
  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Link 
              href={`/litigation/${id}`}
              className="font-semibold text-lg hover:text-primary transition-colors"
            >
              {reference}
            </Link>
            <Badge variant="outline" className="text-xs">
              {stageLabels[stage] || stage}
            </Badge>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/litigation/${id}`}>
                  <FileText className="mr-2 h-4 w-4" />
                  Voir les détails
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                Voir le client
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <StatusBadge status={status} size="sm" />
          <TypeBadge type={type} size="sm" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Client */}
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{clientName}</span>
          {clientCompany && (
            <span className="text-muted-foreground">({clientCompany})</span>
          )}
        </div>
        
        {/* Amounts */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Montant réclamé</p>
            <p className="font-semibold text-lg">{formatCurrency(amount, currency)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Récupéré</p>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-lg text-green-600">
                {formatCurrency(amountRecovered, currency)}
              </p>
              {recoveryRate > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {recoveryRate.toFixed(0)}%
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        {/* Recovery Progress */}
        {amount > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Taux de récupération</span>
              <span>{recoveryRate.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${Math.min(recoveryRate, 100)}%` }}
              />
            </div>
          </div>
        )}
        
        {/* Next Event */}
        {nextEvent && (
          <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-100">
            <Calendar className="h-4 w-4 text-blue-600" />
            <div className="flex-1">
              <p className="text-xs text-blue-600 font-medium">Prochain événement</p>
              <p className="text-sm">{nextEvent.title}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(nextEvent.date), 'd MMMM yyyy', { locale: fr })}
              </p>
            </div>
          </div>
        )}
        
        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {filedAt && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Déposé le {format(new Date(filedAt), 'd MMM yyyy', { locale: fr })}
              </span>
            )}
            {totalCosts > 0 && (
              <span className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                Frais: {formatCurrency(totalCosts, currency)}
              </span>
            )}
          </div>
          <Button variant="ghost" size="sm" asChild className="group-hover:bg-primary group-hover:text-white transition-colors">
            <Link href={`/litigation/${id}`}>
              Détails
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default CaseCard
