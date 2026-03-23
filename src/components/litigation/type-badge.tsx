'use client'

import { Badge } from '@/components/ui/badge'
import { 
  FileText, 
  Users, 
  Scale, 
  Gavel
} from 'lucide-react'

export type LitigationType = 'pre_legal' | 'mediation' | 'court' | 'enforcement'

interface TypeBadgeProps {
  type: LitigationType
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
}

const typeConfig: Record<LitigationType, {
  label: string
  description: string
  color: string
  bgColor: string
  borderColor: string
  icon: React.ReactNode
}> = {
  pre_legal: {
    label: 'Pré-judiciaire',
    description: 'Mise en demeure, formal notices',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    icon: <FileText className="h-3.5 w-3.5" />
  },
  mediation: {
    label: 'Médiation',
    description: 'Médiation par tiers',
    color: 'text-teal-700',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
    icon: <Users className="h-3.5 w-3.5" />
  },
  court: {
    label: 'Tribunal',
    description: 'Procédure judiciaire',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: <Scale className="h-3.5 w-3.5" />
  },
  enforcement: {
    label: 'Exécution',
    description: 'Huissier, saisie',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    icon: <Gavel className="h-3.5 w-3.5" />
  }
}

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1.5'
}

export function TypeBadge({ type, size = 'md', showIcon = true }: TypeBadgeProps) {
  const config = typeConfig[type]
  
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

// Quick type badge without icon
export function TypeBadgeCompact({ type }: { type: LitigationType }) {
  return <TypeBadge type={type} size="sm" showIcon={false} />
}

// Type badge with description
export function TypeBadgeDetailed({ type }: { type: LitigationType }) {
  const config = typeConfig[type]
  
  return (
    <div className="flex flex-col gap-1">
      <Badge 
        variant="outline"
        className={`
          ${config.color} 
          ${config.bgColor} 
          ${config.borderColor}
          text-sm px-2.5 py-1
          font-medium border gap-1.5 w-fit
        `}
      >
        {config.icon}
        {config.label}
      </Badge>
      <span className="text-xs text-muted-foreground">
        {config.description}
      </span>
    </div>
  )
}

// Get all type options for select
export function getTypeOptions() {
  return Object.entries(typeConfig).map(([key, value]) => ({
    value: key,
    label: value.label,
    description: value.description,
    icon: value.icon
  }))
}

// Get type label
export function getTypeLabel(type: LitigationType): string {
  return typeConfig[type].label
}

export default TypeBadge
