// Collection strategy AI module

interface DebtWithClientForStrategy {
  id: string
  amount: number
  dueDate: Date
  clientId: string
  client: {
    name: string
    email: string
    phone?: string
    paymentHistory?: any[]
  }
  status: string
  daysOverdue: number
}

interface CollectionStrategy {
  recommendedChannel: "email" | "sms" | "whatsapp" | "call"
  tone: "gentle" | "firm" | "urgent"
  timing: Date
  template: string
  priority: number
}

export function generateCollectionStrategy(debt: DebtWithClientForStrategy): CollectionStrategy {
  const daysOverdue = debt.daysOverdue || 0
  
  // Determine channel based on overdue days and amount
  let recommendedChannel: CollectionStrategy["recommendedChannel"] = "email"
  let tone: CollectionStrategy["tone"] = "gentle"
  let template = "first_reminder"
  
  if (daysOverdue > 60) {
    recommendedChannel = "call"
    tone = "urgent"
    template = "final_notice"
  } else if (daysOverdue > 30) {
    recommendedChannel = "sms"
    tone = "firm"
    template = "urgent_reminder"
  } else if (daysOverdue > 14) {
    recommendedChannel = "email"
    tone = "firm"
    template = "second_reminder"
  }
  
  // Prioritize higher amounts
  const priority = debt.amount > 500000 ? 1 : debt.amount > 200000 ? 2 : 3
  
  // Best time to send (business hours)
  const timing = new Date()
  timing.setHours(9, 0, 0, 0)
  if (timing < new Date()) {
    timing.setDate(timing.getDate() + 1)
  }
  
  return {
    recommendedChannel,
    tone,
    timing,
    template,
    priority,
  }
}

export function optimizeReminderSequence(debts: DebtWithClientForStrategy[]): DebtWithClientForStrategy[] {
  return debts
    .map(debt => ({
      ...debt,
      strategy: generateCollectionStrategy(debt),
    }))
    .sort((a, b) => {
      // Sort by priority first, then by amount
      const strategyA = a.strategy as CollectionStrategy
      const strategyB = b.strategy as CollectionStrategy
      if (strategyA.priority !== strategyB.priority) {
        return strategyA.priority - strategyB.priority
      }
      return b.amount - a.amount
    })
    .map(({ strategy, ...debt }) => debt)
}

export function suggestNegotiationTerms(debt: DebtWithClientForStrategy): {
  discount: number
  installmentPlan: number
  extendedDueDate: Date
} {
  const daysOverdue = debt.daysOverdue || 0
  
  // Suggest discount for early payment
  const discount = daysOverdue < 30 ? 5 : daysOverdue < 60 ? 3 : 0
  
  // Suggest installment plan based on amount
  const installmentPlan = debt.amount > 500000 ? 3 : debt.amount > 200000 ? 2 : 1
  
  // Suggest extended due date
  const extendedDueDate = new Date()
  extendedDueDate.setDate(extendedDueDate.getDate() + 30)
  
  return {
    discount,
    installmentPlan,
    extendedDueDate,
  }
}

export function escalationRecommendation(debt: DebtWithClientForStrategy): {
  escalate: boolean
  reason: string
  nextAction: string
} {
  const daysOverdue = debt.daysOverdue || 0
  
  if (daysOverdue > 90) {
    return {
      escalate: true,
      reason: "Retard excessif - plus de 90 jours",
      nextAction: "Transférer au service contentieux",
    }
  }
  
  if (daysOverdue > 60 && debt.amount > 1000000) {
    return {
      escalate: true,
      reason: "Montant élevé avec retard important",
      nextAction: "Appel téléphonique direct",
    }
  }
  
  return {
    escalate: false,
    reason: "Continuer la procédure standard",
    nextAction: "Envoyer prochaine relance",
  }
}

export function getStrategyForClient(clientId: string): CollectionStrategy {
  return {
    recommendedChannel: "email",
    tone: "gentle",
    timing: new Date(),
    template: "first_reminder",
    priority: 2,
  }
}
