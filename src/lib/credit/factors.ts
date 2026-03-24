// Credit factors

export const CREDIT_RATINGS = {
  A: { min: 80, max: 100, label: "Excellent", color: "green" },
  B: { min: 60, max: 79, label: "Bon", color: "blue" },
  C: { min: 40, max: 59, label: "Moyen", color: "yellow" },
  D: { min: 20, max: 39, label: "Faible", color: "orange" },
  E: { min: 0, max: 19, label: "Critique", color: "red" },
}

export type CreditRating = keyof typeof CREDIT_RATINGS

export const CREDIT_LIMIT_MULTIPLIERS: Record<CreditRating, number> = {
  A: 2.0,
  B: 1.5,
  C: 1.0,
  D: 0.5,
  E: 0.0,
}

export const SCORE_ZONES = [
  { min: 0, max: 19, color: "#ef4444", label: "Critique" },
  { min: 20, max: 39, color: "#f97316", label: "Faible" },
  { min: 40, max: 59, color: "#eab308", label: "Moyen" },
  { min: 60, max: 79, color: "#3b82f6", label: "Bon" },
  { min: 80, max: 100, color: "#22c55e", label: "Excellent" },
]

export function getRatingFromScore(score: number): CreditRating {
  if (score >= 80) return "A"
  if (score >= 60) return "B"
  if (score >= 40) return "C"
  if (score >= 20) return "D"
  return "E"
}

export function calculateCreditLimit(baseAmount: number, rating: CreditRating): number {
  return baseAmount * CREDIT_LIMIT_MULTIPLIERS[rating]
}

export function getImpactColor(impact: "positive" | "negative"): string {
  return impact === "positive" ? "text-green-600" : "text-red-600"
}

export function getFactorWeight(factor: string): number {
  const weights: Record<string, number> = {
    payment_history: 35,
    debt_amount: 25,
    account_age: 15,
    recent_activity: 10,
    communication: 15,
  }
  return weights[factor] || 10
}

export function getScoreZone(score: number): typeof SCORE_ZONES[0] {
  return SCORE_ZONES.find(zone => score >= zone.min && score <= zone.max) || SCORE_ZONES[0]
}
