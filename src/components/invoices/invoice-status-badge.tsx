'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { 
  FileText, 
  Send, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Clock
} from 'lucide-react'

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus | string
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  className?: string
}

const statusConfig: Record<InvoiceStatus, {
  label: string
  color: string
  bgColor: string
  borderColor: string
  icon: React.ComponentType<{ className?: string }>
}> = {
  draft: {
    label: 'Brouillon',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-200',
    icon: FileText
  },
  sent: {
    label: 'Envoyée',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: Send
  },
  paid: {
    label: 'Payée',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: CheckCircle
  },
  overdue: {
    label: 'En retard',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: AlertTriangle
  },
  cancelled: {
    label: 'Annulée',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
    icon: XCircle
  }
}

const sizeConfig = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1.5'
}

export function InvoiceStatusBadge({ 
  status, 
  size = 'md', 
  showIcon = true,
  className 
}: InvoiceStatusBadgeProps) {
  const config = statusConfig[status as InvoiceStatus] || statusConfig.draft
  const Icon = config.icon
  
  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium border gap-1.5',
        config.color,
        config.bgColor,
        config.borderColor,
        sizeConfig[size],
        className
      )}
    >
      {showIcon && <Icon className={cn('size-3.5', size === 'sm' && 'size-3')} />}
      {config.label}
    </Badge>
  )
}

// Compact version for tables
export function InvoiceStatusBadgeCompact({ 
  status,
  className 
}: { 
  status: InvoiceStatus | string
  className?: string 
}) {
  const config = statusConfig[status as InvoiceStatus] || statusConfig.draft
  const Icon = config.icon
  
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
        config.color,
        config.bgColor,
        className
      )}
    >
      <Icon className="size-3" />
      {config.label}
    </span>
  )
}

// With additional context
export function InvoiceStatusBadgeWithDate({ 
  status,
  date,
  className 
}: { 
  status: InvoiceStatus | string
  date?: Date | string | null
  className?: string 
}) {
  const config = statusConfig[status as InvoiceStatus] || statusConfig.draft
  const Icon = config.icon
  
  const formatDate = (d: Date | string) => {
    const dateObj = typeof d === 'string' ? new Date(d) : d
    return dateObj.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }
  
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Badge
        variant="outline"
        className={cn(
          'font-medium border gap-1.5',
          config.color,
          config.bgColor,
          config.borderColor
        )}
      >
        <Icon className="size-3.5" />
        {config.label}
      </Badge>
      {date && (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="size-3" />
          {formatDate(date)}
        </span>
      )}
    </div>
  )
}

// Status indicator dot for compact views
export function InvoiceStatusDot({ 
  status,
  className 
}: { 
  status: InvoiceStatus | string
  className?: string 
}) {
  const colors: Record<InvoiceStatus, string> = {
    draft: 'bg-gray-400',
    sent: 'bg-blue-500',
    paid: 'bg-green-500',
    overdue: 'bg-red-500',
    cancelled: 'bg-gray-500'
  }
  
  return (
    <span
      className={cn(
        'size-2 rounded-full',
        colors[status as InvoiceStatus] || colors.draft,
        className
      )}
    />
  )
}

// Export status config for use in other components
export { statusConfig }
