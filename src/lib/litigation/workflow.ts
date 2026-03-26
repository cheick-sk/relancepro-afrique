/**
 * Litigation Workflow Library
 * Manages workflow stages, auto-progress, and reminders
 */

import { db } from '@/lib/db'

// Workflow stages definition
export const WORKFLOW_STAGES = {
  initial: {
    label: 'Initial',
    description: 'Dossier créé, en attente de traitement',
    order: 1,
    nextStages: ['assigned'],
    requiredActions: ['create_case'],
    color: 'gray'
  },
  assigned: {
    label: 'Assigné',
    description: 'Dossier assigné à un avocat ou huissier',
    order: 2,
    nextStages: ['hearing', 'execution'],
    requiredActions: ['assign_lawyer', 'send_demand_letter'],
    color: 'blue'
  },
  hearing: {
    label: 'Audience',
    description: 'Procédure en cours devant le tribunal',
    order: 3,
    nextStages: ['judgment'],
    requiredActions: ['schedule_hearing', 'file_documents'],
    color: 'purple'
  },
  judgment: {
    label: 'Jugement',
    description: 'Jugement rendu',
    order: 4,
    nextStages: ['execution', 'closed'],
    requiredActions: ['receive_judgment'],
    color: 'orange'
  },
  execution: {
    label: 'Exécution',
    description: 'Exécution de la décision judiciaire',
    order: 5,
    nextStages: ['closed'],
    requiredActions: ['start_enforcement', 'collect_payment'],
    color: 'teal'
  }
}

// Event types that trigger stage changes
export const STAGE_TRANSITION_EVENTS: Record<string, string> = {
  'lawyer_assigned': 'assigned',
  'demand_letter_sent': 'assigned',
  'hearing_scheduled': 'hearing',
  'court_filing': 'hearing',
  'judgment_rendered': 'judgment',
  'enforcement_started': 'execution',
  'payment_received': 'execution',
  'case_closed': 'closed'
}

// Status transitions
export const STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['in_progress'],
  in_progress: ['closed', 'won', 'lost'],
  closed: [],
  won: [],
  lost: []
}

// Deadline types
export const DEADLINE_TYPES = {
  demand_letter_response: {
    label: 'Réponse mise en demeure',
    days: 15,
    description: 'Délai de réponse à la mise en demeure'
  },
  appeal: {
    label: 'Délai d\'appel',
    days: 30,
    description: 'Délai pour faire appel du jugement'
  },
  execution: {
    label: 'Délai d\'exécution',
    days: 60,
    description: 'Délai pour l\'exécution du jugement'
  },
  payment_plan: {
    label: 'Échéancier de paiement',
    days: 30,
    description: 'Délai de paiement selon l\'échéancier'
  }
}

/**
 * Auto-progress the stage based on event
 */
export async function autoProgressStage(
  litigationId: string,
  eventType: string
): Promise<{ newStage: string | null; message: string }> {
  const newStage = STAGE_TRANSITION_EVENTS[eventType]
  
  if (!newStage) {
    return { newStage: null, message: 'No stage transition for this event' }
  }

  const litigation = await db.litigation.findUnique({
    where: { id: litigationId },
    select: { stage: true, status: true }
  })

  if (!litigation) {
    throw new Error('Litigation not found')
  }

  // Check if transition is valid
  const currentStageConfig = WORKFLOW_STAGES[litigation.stage as keyof typeof WORKFLOW_STAGES]
  
  if (newStage === 'closed') {
    // Handle status change to closed/won/lost
    const status = eventType === 'case_won' ? 'won' : eventType === 'case_lost' ? 'lost' : 'closed'
    
    await db.litigation.update({
      where: { id: litigationId },
      data: {
        status,
        closedAt: new Date()
      }
    })
    
    return { 
      newStage: litigation.stage, 
      message: `Status changed to ${status}` 
    }
  }

  if (currentStageConfig && !currentStageConfig.nextStages.includes(newStage)) {
    return { 
      newStage: null, 
      message: `Cannot transition from ${litigation.stage} to ${newStage}` 
    }
  }

  // Update stage
  await db.litigation.update({
    where: { id: litigationId },
    data: {
      stage: newStage,
      status: 'in_progress'
    }
  })

  // Create stage change event
  await db.litigationEvent.create({
    data: {
      litigationId,
      type: 'status_change',
      title: `Étape: ${WORKFLOW_STAGES[newStage as keyof typeof WORKFLOW_STAGES]?.label || newStage}`,
      description: WORKFLOW_STAGES[newStage as keyof typeof WORKFLOW_STAGES]?.description,
      eventDate: new Date(),
      status: 'completed'
    }
  })

  return { 
    newStage, 
    message: `Stage updated from ${litigation.stage} to ${newStage}` 
  }
}

/**
 * Calculate next deadline for a litigation
 */
export function calculateNextDeadline(
  stage: string,
  events: Array<{ type: string; eventDate: Date }>
): { type: string; date: Date; label: string } | null {
  const now = new Date()
  
  // Find most recent relevant event
  const relevantEvents = events.filter(e => e.eventDate <= now)
  if (relevantEvents.length === 0) return null
  
  const lastEvent = relevantEvents.sort((a, b) => 
    new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
  )[0]

  // Calculate deadline based on stage and last event
  switch (stage) {
    case 'initial':
    case 'assigned':
      if (lastEvent.type === 'document' && lastEvent.title?.includes('mise en demeure')) {
        const deadline = new Date(lastEvent.eventDate)
        deadline.setDate(deadline.getDate() + DEADLINE_TYPES.demand_letter_response.days)
        return {
          type: 'demand_letter_response',
          date: deadline,
          label: DEADLINE_TYPES.demand_letter_response.label
        }
      }
      break
      
    case 'hearing':
      // Look for scheduled hearing
      const hearingEvent = events.find(e => 
        e.type === 'hearing' && new Date(e.eventDate) > now
      )
      if (hearingEvent) {
        return {
          type: 'hearing',
          date: new Date(hearingEvent.eventDate),
          label: 'Audience programmée'
        }
      }
      break
      
    case 'judgment':
      if (lastEvent.type === 'judgment') {
        const deadline = new Date(lastEvent.eventDate)
        deadline.setDate(deadline.getDate() + DEADLINE_TYPES.appeal.days)
        return {
          type: 'appeal',
          date: deadline,
          label: DEADLINE_TYPES.appeal.label
        }
      }
      break
      
    case 'execution':
      if (lastEvent.type === 'judgment') {
        const deadline = new Date(lastEvent.eventDate)
        deadline.setDate(deadline.getDate() + DEADLINE_TYPES.execution.days)
        return {
          type: 'execution',
          date: deadline,
          label: DEADLINE_TYPES.execution.label
        }
      }
      break
  }

  return null
}

/**
 * Get required actions for current stage
 */
export function getRequiredActions(stage: string, litigation: {
  parties: Array<{ type: string }>
  documents: Array<{ type: string }>
  events: Array<{ type: string }>
}): Array<{ action: string; label: string; completed: boolean }> {
  const stageConfig = WORKFLOW_STAGES[stage as keyof typeof WORKFLOW_STAGES]
  if (!stageConfig) return []

  const actions: Array<{ action: string; label: string; completed: boolean }> = []

  // Check for lawyer assignment
  actions.push({
    action: 'assign_lawyer',
    label: 'Assigner un avocat',
    completed: litigation.parties.some(p => p.type === 'lawyer')
  })

  // Check for demand letter
  actions.push({
    action: 'send_demand_letter',
    label: 'Envoyer mise en demeure',
    completed: litigation.documents.some(d => d.type === 'demand_letter')
  })

  // Check for court filing
  if (['hearing', 'judgment', 'execution'].includes(stage)) {
    actions.push({
      action: 'file_documents',
      label: 'Déposer les documents au tribunal',
      completed: litigation.documents.some(d => d.type === 'court_filing')
    })
  }

  // Check for bailiff for execution
  if (stage === 'execution') {
    actions.push({
      action: 'assign_bailiff',
      label: 'Assigner un huissier',
      completed: litigation.parties.some(p => p.type === 'bailiff')
    })
  }

  return actions
}

/**
 * Create reminder for upcoming deadline
 */
export async function createDeadlineReminder(
  litigationId: string,
  deadlineType: string,
  deadlineDate: Date,
  reminderDaysBefore: number = 3
): Promise<void> {
  const reminderDate = new Date(deadlineDate)
  reminderDate.setDate(reminderDate.getDate() - reminderDaysBefore)

  const deadlineConfig = DEADLINE_TYPES[deadlineType as keyof typeof DEADLINE_TYPES]

  await db.litigationEvent.create({
    data: {
      litigationId,
      type: 'note',
      title: `Rappel: ${deadlineConfig?.label || deadlineType}`,
      description: deadlineConfig?.description || `Échéance dans ${reminderDaysBefore} jours`,
      eventDate: deadlineDate,
      reminderDate: reminderDate,
      status: 'scheduled'
    }
  })
}

/**
 * Get workflow summary for dashboard
 */
export function getWorkflowSummary(litigations: Array<{
  stage: string
  status: string
  events: Array<{ eventDate: Date; type: string }>
}>): {
  byStage: Record<string, number>
  byStatus: Record<string, number>
  upcomingDeadlines: number
  overdueCases: number
} {
  const now = new Date()
  
  const summary = {
    byStage: {} as Record<string, number>,
    byStatus: {} as Record<string, number>,
    upcomingDeadlines: 0,
    overdueCases: 0
  }

  for (const lit of litigations) {
    // Count by stage
    summary.byStage[lit.stage] = (summary.byStage[lit.stage] || 0) + 1
    
    // Count by status
    summary.byStatus[lit.status] = (summary.byStatus[lit.status] || 0) + 1
    
    // Check for upcoming deadlines (events in next 7 days)
    const upcomingEvents = lit.events.filter(e => {
      const eventDate = new Date(e.eventDate)
      const daysDiff = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      return daysDiff >= 0 && daysDiff <= 7 && e.type === 'hearing'
    })
    summary.upcomingDeadlines += upcomingEvents.length

    // Check for overdue cases (pending/in_progress with past due dates)
    if (['pending', 'in_progress'].includes(lit.status)) {
      const overdueEvents = lit.events.filter(e => 
        new Date(e.eventDate) < now && e.type === 'hearing'
      )
      summary.overdueCases += overdueEvents.length > 0 ? 1 : 0
    }
  }

  return summary
}

/**
 * Get stage options for select
 */
export function getStageOptions(): Array<{ value: string; label: string; description: string }> {
  return Object.entries(WORKFLOW_STAGES)
    .sort((a, b) => a[1].order - b[1].order)
    .map(([key, value]) => ({
      value: key,
      label: value.label,
      description: value.description
    }))
}

/**
 * Validate stage transition
 */
export function canTransitionTo(
  currentStage: string,
  targetStage: string
): { valid: boolean; reason?: string } {
  if (currentStage === targetStage) {
    return { valid: false, reason: 'Already at this stage' }
  }

  const currentConfig = WORKFLOW_STAGES[currentStage as keyof typeof WORKFLOW_STAGES]
  
  if (!currentConfig) {
    return { valid: false, reason: 'Invalid current stage' }
  }

  if (!currentConfig.nextStages.includes(targetStage)) {
    return { 
      valid: false, 
      reason: `Cannot transition from ${currentStage} to ${targetStage}. Valid next stages: ${currentConfig.nextStages.join(', ')}` 
    }
  }

  return { valid: true }
}
