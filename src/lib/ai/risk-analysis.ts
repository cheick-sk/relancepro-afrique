// Risk analysis for clients

interface RiskAssessment {
  score: number // 0-100
  level: "low" | "medium" | "high" | "critical"
  factors: RiskFactor[]
  recommendations: string[]
}

interface RiskFactor {
  name: string
  impact: "positive" | "negative"
  weight: number
  description: string
}

export function analyzeClientRisk(client: any, debts: any[]): RiskAssessment {
  let score = 50 // Base score
  const factors: RiskFactor[] = []
  
  // Payment history factor
  const paidDebts = debts.filter(d => d.status === "PAID").length
  const totalDebts = debts.length
  const paymentRate = totalDebts > 0 ? (paidDebts / totalDebts) * 100 : 100
  
  if (paymentRate > 80) {
    score += 20
    factors.push({
      name: "Historique de paiement",
      impact: "positive",
      weight: 20,
      description: "Taux de paiement élevé",
    })
  } else if (paymentRate < 50) {
    score -= 20
    factors.push({
      name: "Historique de paiement",
      impact: "negative",
      weight: 20,
      description: "Taux de paiement faible",
    })
  }
  
  // Current overdue debts
  const overdueDebts = debts.filter(d => d.status === "OVERDUE")
  if (overdueDebts.length > 3) {
    score -= 15
    factors.push({
      name: "Créances en retard",
      impact: "negative",
      weight: 15,
      description: `${overdueDebts.length} créances en retard`,
    })
  }
  
  // Amount at risk
  const totalOverdue = overdueDebts.reduce((sum, d) => sum + (d.amount || 0), 0)
  if (totalOverdue > 1000000) {
    score -= 10
    factors.push({
      name: "Montant à risque",
      impact: "negative",
      weight: 10,
      description: "Montant élevé en impayés",
    })
  }
  
  score = Math.max(0, Math.min(100, score))
  
  const level = score >= 70 ? "low" : score >= 50 ? "medium" : score >= 30 ? "high" : "critical"
  
  return {
    score,
    level,
    factors,
    recommendations: getRiskMitigationSuggestions(level, factors),
  }
}

export function getRiskMitigationSuggestions(level: string, factors: RiskFactor[]): string[] {
  const suggestions: string[] = []
  
  if (level === "critical" || level === "high") {
    suggestions.push("Envisager des conditions de paiement anticipé")
    suggestions.push("Demander des garanties")
    suggestions.push("Limiter le crédit")
  }
  
  if (level === "medium") {
    suggestions.push("Surveiller les délais de paiement")
    suggestions.push("Proposer des échéanciers")
  }
  
  if (level === "low") {
    suggestions.push("Maintenir les conditions actuelles")
    suggestions.push("Offrir des facilités de paiement")
  }
  
  return suggestions
}
