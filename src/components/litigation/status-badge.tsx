'use client'

import { Badge } from '@/components/ui/badge'
import { 
  Clock, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Archive,
  AlertCircle
} from 'lucide-react'

export type LitigationStatus = 'pending' | 'in_progress' | 'closed' | 'won' | 'lost'

interface StatusBadgeProps {
  status: LitigationStatus
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
}

const statusConfig: Record<LitigationStatus, {
  label: string
  color: string
  bgColor: string
  borderColor: string
  icon: React.ReactNode
}> = {
  pending: {
    label: 'En attente',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    icon: <Clock className="h-3.5 w-3.5" />
  },
  in_progress: {
    label: 'En cours',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: <Loader2 className="h-3.5 w-3.5" />
  },
  closed: {
    label: 'Clôturé',
    color: 'text-gray-700',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    icon: <Archive className="h-3.5 w-3.5" />
  },
  won: {
    label: 'Gagné',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />
  },
  lost: {
    label: 'Perdu',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: <XCircle className="h-3.5 w-3.5" />
  }
}

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1.5'
}

export function StatusBadge({ status, size = 'md', showIcon = true }: StatusBadgeProps) {
  const config = statusConfig[status]
  
  return (
    <Badge 
      variant="outline"
      className={`
        ${config.color} 
        ${config.bgColor} 
        ${config.borderColor}
        ${sizeClasses[size]}
        font-medium border gap-1.5
      `}
    >
      {showIcon && config.icon}
      {config.label}
    </Badge>
  )
}

// Legacy compatibility - using amber for pending
export function StatusBadgeAmber({ status, size = 'md' }: Omit<StatusBadgeProps, 'showIcon'>) {
  return <StatusBadge status={status} size={size} showIcon />
}

// Quick status badge without icon
export function StatusBadgeCompact({ status }: { status: LitigationStatus }) {
  return <StatusBadge status={status} size="sm" showIcon={false} />
}

// Status badge with additional info
export function StatusBadgeDetailed({ 
  status, 
  days 
}: { 
  status: LitigationStatus
  days?: number 
}) {
  const config = statusConfig[status]
  
  return (
    <div className="flex items-center gap-2">
      <Badge 
        variant="outline"
        className={`
          ${config.color} 
          ${config.bgColor} 
          ${config.borderColor}
          text-sm px-2.5 py-1
          font-medium border gap-1.5
        `}
      >
        {config.icon}
        {config.label}
      </Badge>
      {days !== undefined && (
        <span className="text-xs text-muted-foreground">
          {days} jours
        </span>
      )}
    </div>
  )
}

export default StatusBadge
