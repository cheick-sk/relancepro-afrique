/**
 * Credit Scoring Factors and Weights
 * RelancePro Africa - Comprehensive Credit Scoring Module
 */

// Credit rating definitions with score ranges
export const CREDIT_RATINGS = {
  AAA: { min: 900, max: 1000, label: 'Excellent', color: '#10B981', description: 'Exceptional creditworthiness' },
  AA:  { min: 800, max: 899,  label: 'Very Good', color: '#22C55E', description: 'Very strong credit profile' },
  A:   { min: 700, max: 799,  label: 'Good', color: '#84CC16', description: 'Good credit standing' },
  BBB: { min: 600, max: 699,  label: 'Fair', color: '#EAB308', description: 'Acceptable credit risk' },
  BB:  { min: 500, max: 599,  label: 'Below Average', color: '#F97316', description: 'Some credit concerns' },
  B:   { min: 400, max: 499,  label: 'Poor', color: '#FB923C', description: 'Significant credit issues' },
  CCC: { min: 300, max: 399,  label: 'Very Poor', color: '#EF4444', description: 'High credit risk' },
  CC:  { min: 200, max: 299,  label: 'Critical', color: '#DC2626', description: 'Severe credit problems' },
  C:   { min: 100, max: 199,  label: 'Default Risk', color: '#B91C1C', description: 'Near default status' },
  D:   { min: 0,   max: 99,   label: 'Default', color: '#7F1D1D', description: 'In default' },
} as const

export type CreditRating = keyof typeof CREDIT_RATINGS

// Payment status types
export type PaymentStatus = 'on_time' | 'late' | 'very_late' | 'default'

// Scoring factor definition
export interface ScoringFactor {
  name: string
  weight: number // percentage (total should be 100)
  score: number  // 0-100 individual score
  impact: 'positive' | 'negative' | 'neutral'
  description: string
  suggestion?: string
  details?: Record<string, unknown>
}

// Factor weights (must sum to 100)
export const FACTOR_WEIGHTS = {
  PAYMENT_HISTORY: 35,    // Most important factor
  OUTSTANDING_DEBT: 30,   // Current debt level
  CREDIT_AGE: 15,         // Length of credit history
  NEW_INQUIRIES: 10,      // Recent credit inquiries
  CREDIT_MIX: 10,         // Mix of credit types
} as const

// Factor labels in French and English
export const FACTOR_LABELS = {
  fr: {
    paymentHistory: 'Historique de paiements',
    outstandingDebt: 'Dette en cours',
    creditAge: 'Anciennete credit',
    newInquiries: 'Nouvelles demandes',
    creditMix: 'Diversite credit',
  },
  en: {
    paymentHistory: 'Payment History',
    outstandingDebt: 'Outstanding Debt',
    creditAge: 'Credit Age',
    newInquiries: 'New Inquiries',
    creditMix: 'Credit Mix',
  },
} as const

// Factor descriptions
export const FACTOR_DESCRIPTIONS = {
  paymentHistory: {
    fr: 'Votre historique de paiements est le facteur le plus important. Les paiements en temps et en heure ameliorent votre score.',
    en: 'Your payment history is the most important factor. On-time payments improve your score.',
  },
  outstandingDebt: {
    fr: 'Le montant total de vos dettes par rapport a vos limites de credit. Un taux dutilisation bas est preferable.',
    en: 'The total amount of your debts relative to your credit limits. A low utilization rate is better.',
  },
  creditAge: {
    fr: 'Lanciennete de votre historique de credit. Plus votre historique est long, mieux cest.',
    en: 'The age of your credit history. A longer history is better.',
  },
  newInquiries: {
    fr: 'Les demandes de credit recentes peuvent affecter votre score temporairement.',
    en: 'Recent credit inquiries can temporarily affect your score.',
  },
  creditMix: {
    fr: 'La diversite de vos types de credit (factures, prets, etc.) peut ameliorer votre score.',
    en: 'The diversity of your credit types (invoices, loans, etc.) can improve your score.',
  },
}

// Payment status impacts
export const PAYMENT_STATUS_IMPACT: Record<PaymentStatus, number> = {
  on_time: 100,   // Full points
  late: 70,       // Minor penalty
  very_late: 40,  // Significant penalty
  default: 0,     // Maximum penalty
}

// Days late thresholds
export const DAYS_LATE_THRESHOLDS = {
  ON_TIME: 0,       // 0 days late
  LATE: 30,         // 1-30 days late
  VERY_LATE: 60,    // 31-60 days late
  DEFAULT: 90,      // 90+ days late
}

// Credit limit multipliers by rating
export const CREDIT_LIMIT_MULTIPLIERS: Record<CreditRating, number> = {
  AAA: 3.0,  // 3x monthly income
  AA: 2.5,
  A: 2.0,
  BBB: 1.5,
  BB: 1.0,
  B: 0.75,
  CCC: 0.5,
  CC: 0.25,
  C: 0.1,
  D: 0,
}

// Risk level mapping
export const RISK_LEVELS: Record<string, { level: string; color: string; description: string }> = {
  excellent: { level: 'low', color: '#10B981', description: 'Very low risk' },
  good: { level: 'low', color: '#22C55E', description: 'Low risk' },
  fair: { level: 'medium', color: '#EAB308', description: 'Moderate risk' },
  poor: { level: 'high', color: '#F97316', description: 'High risk' },
  critical: { level: 'high', color: '#EF4444', description: 'Very high risk' },
}

// Score zones for visual display
export const SCORE_ZONES = [
  { min: 0, max: 299, label: 'Critical', color: '#EF4444', bgColor: 'bg-red-500' },
  { min: 300, max: 499, label: 'Poor', color: '#F97316', bgColor: 'bg-orange-500' },
  { min: 500, max: 699, label: 'Fair', color: '#EAB308', bgColor: 'bg-yellow-500' },
  { min: 700, max: 799, label: 'Good', color: '#84CC16', bgColor: 'bg-lime-500' },
  { min: 800, max: 1000, label: 'Excellent', color: '#10B981', bgColor: 'bg-emerald-500' },
]

/**
 * Get rating from score
 */
export function getRatingFromScore(score: number): CreditRating {
  if (score >= 900) return 'AAA'
  if (score >= 800) return 'AA'
  if (score >= 700) return 'A'
  if (score >= 600) return 'BBB'
  if (score >= 500) return 'BB'
  if (score >= 400) return 'B'
  if (score >= 300) return 'CCC'
  if (score >= 200) return 'CC'
  if (score >= 100) return 'C'
  return 'D'
}

/**
 * Get score zone for visual display
 */
export function getScoreZone(score: number) {
  return SCORE_ZONES.find(zone => score >= zone.min && score <= zone.max) || SCORE_ZONES[0]
}

/**
 * Get risk level from rating
 */
export function getRiskLevel(rating: CreditRating) {
  if (['AAA', 'AA', 'A'].includes(rating)) {
    return { level: 'low', color: '#10B981', description: 'Low credit risk' }
  }
  if (['BBB', 'BB'].includes(rating)) {
    return { level: 'medium', color: '#EAB308', description: 'Moderate credit risk' }
  }
  return { level: 'high', color: '#EF4444', description: 'High credit risk' }
}

/**
 * Calculate recommended credit limit
 */
export function calculateCreditLimit(
  score: number,
  monthlyIncome?: number,
  currentDebt: number = 0
): number {
  const rating = getRatingFromScore(score)
  const multiplier = CREDIT_LIMIT_MULTIPLIERS[rating]
  
  if (!monthlyIncome) {
    // Default calculation without income
    return Math.max(0, (score / 10) * 1000 - currentDebt)
  }
  
  const baseLimit = monthlyIncome * multiplier
  const availableLimit = Math.max(0, baseLimit - currentDebt)
  
  return Math.round(availableLimit)
}

/**
 * Determine payment status from days late
 */
export function getPaymentStatusFromDaysLate(daysLate: number): PaymentStatus {
  if (daysLate <= DAYS_LATE_THRESHOLDS.ON_TIME) return 'on_time'
  if (daysLate <= DAYS_LATE_THRESHOLDS.LATE) return 'late'
  if (daysLate <= DAYS_LATE_THRESHOLDS.VERY_LATE) return 'very_late'
  return 'default'
}

/**
 * Get impact color for UI display
 */
export function getImpactColor(impact: 'positive' | 'negative' | 'neutral'): string {
  switch (impact) {
    case 'positive':
      return '#10B981' // Green
    case 'negative':
      return '#EF4444' // Red
    default:
      return '#6B7280' // Gray
  }
}

/**
 * Get impact icon name
 */
export function getImpactIcon(impact: 'positive' | 'negative' | 'neutral'): string {
  switch (impact) {
    case 'positive':
      return 'trending-up'
    case 'negative':
      return 'trending-down'
    default:
      return 'minus'
  }
}

/**
 * Format credit score for display
 */
export function formatCreditScore(score: number | null | undefined): string {
  if (score === null || score === undefined) return '---'
  return score.toString().padStart(3, '0')
}

/**
 * Get rating label in specified language
 */
export function getRatingLabel(rating: CreditRating, lang: 'fr' | 'en' = 'fr'): string {
  return CREDIT_RATINGS[rating].label
}

/**
 * Get rating color
 */
export function getRatingColor(rating: CreditRating): string {
  return CREDIT_RATINGS[rating].color
}
