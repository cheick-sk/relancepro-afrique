/**
 * Credit Scoring Algorithm
 * RelancePro Africa - Comprehensive Credit Scoring Module
 */

import { db } from '@/lib/db'
import {
  FACTOR_WEIGHTS,
  CREDIT_RATINGS,
  type CreditRating,
  type ScoringFactor,
  type PaymentStatus,
  getRatingFromScore,
  getPaymentStatusFromDaysLate,
  PAYMENT_STATUS_IMPACT,
} from './factors'

// Types
export interface CreditScoreResult {
  score: number // 0-1000
  rating: CreditRating
  factors: ScoringFactor[]
  riskLevel: 'low' | 'medium' | 'high'
  recommendation: string
}

export interface PaymentHistoryRecord {
  amount: number
  dueDate: Date
  paidDate: Date | null
  daysLate: number
  status: PaymentStatus
}

/**
 * Calculate comprehensive credit score for a client
 */
export async function calculateCreditScore(clientId: string): Promise<CreditScoreResult> {
  // Get client with related data
  const client = await db.client.findUnique({
    where: { id: clientId },
    include: {
      debts: {
        where: {
          status: { in: ['pending', 'partial'] }
        }
      },
      clientPayments: {
        where: {
          status: 'success'
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      },
      paymentHistoryRecords: {
        orderBy: { dueDate: 'desc' },
        take: 24 // Last 2 years (12 months x 2 for monthly payments)
      },
      creditReports: {
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    }
  })

  if (!client) {
    throw new Error('Client not found')
  }

  // Calculate each factor
  const paymentHistoryFactor = await getPaymentHistoryFactor(clientId, client.paymentHistoryRecords || [])
  const outstandingDebtFactor = getOutstandingDebtFactor(client.debts || [])
  const creditAgeFactor = getCreditAgeFactor(client.createdAt)
  const inquiryFactor = await getInquiryFactor(clientId, client.creditInquiries)
  const creditMixFactor = getCreditMixFactor(client.debts || [])

  const factors: ScoringFactor[] = [
    paymentHistoryFactor,
    outstandingDebtFactor,
    creditAgeFactor,
    inquiryFactor,
    creditMixFactor
  ]

  // Calculate weighted score (0-100 scale first)
  const weightedScore = factors.reduce((total, factor) => {
    return total + (factor.score * factor.weight / 100)
  }, 0)

  // Convert to 0-1000 scale
  const score = Math.round(weightedScore * 10)

  // Clamp score between 0 and 1000
  const clampedScore = Math.max(0, Math.min(1000, score))

  // Get rating
  const rating = getRatingFromScore(clampedScore)

  // Determine risk level
  const riskLevel = getRiskLevelFromRating(rating)

  // Generate recommendation
  const recommendation = generateRecommendation(factors, rating)

  return {
    score: clampedScore,
    rating,
    factors,
    riskLevel,
    recommendation
  }
}

/**
 * Calculate payment history factor (35% weight)
 */
export async function getPaymentHistoryFactor(
  clientId: string,
  paymentRecords: PaymentHistoryRecord[]
): Promise<ScoringFactor> {
  if (paymentRecords.length === 0) {
    return {
      name: 'Payment History',
      weight: FACTOR_WEIGHTS.PAYMENT_HISTORY,
      score: 50, // Neutral score for no history
      impact: 'neutral',
      description: 'No payment history available',
      suggestion: 'Build payment history by making regular payments on time'
    }
  }

  // Calculate on-time payment percentage
  const totalPayments = paymentRecords.length
  const onTimePayments = paymentRecords.filter(p => p.status === 'on_time').length
  const latePayments = paymentRecords.filter(p => p.status === 'late').length
  const veryLatePayments = paymentRecords.filter(p => p.status === 'very_late').length
  const defaultedPayments = paymentRecords.filter(p => p.status === 'default').length

  // Calculate weighted score
  let score = 0
  for (const record of paymentRecords) {
    score += PAYMENT_STATUS_IMPACT[record.status]
  }
  score = score / totalPayments

  // Determine impact
  let impact: 'positive' | 'negative' | 'neutral'
  if (score >= 80) impact = 'positive'
  else if (score >= 50) impact = 'neutral'
  else impact = 'negative'

  // Generate description
  const onTimePercent = Math.round((onTimePayments / totalPayments) * 100)
  const description = `${onTimePercent}% on-time payments (${onTimePayments}/${totalPayments})`

  // Generate suggestion
  let suggestion: string | undefined
  if (impact === 'negative') {
    suggestion = 'Improve your score by making all payments on time for the next 6 months'
  } else if (impact === 'neutral') {
    suggestion = 'Continue making payments on time to improve your score'
  }

  return {
    name: 'Payment History',
    weight: FACTOR_WEIGHTS.PAYMENT_HISTORY,
    score,
    impact,
    description,
    suggestion,
    details: {
      totalPayments,
      onTimePayments,
      latePayments,
      veryLatePayments,
      defaultedPayments,
      onTimePercent
    }
  }
}

/**
 * Calculate outstanding debt factor (30% weight)
 */
export function getOutstandingDebtFactor(debts: Array<{
  amount: number
  paidAmount: number
  status: string
}>): ScoringFactor {
  const totalDebt = debts.reduce((sum, d) => sum + d.amount, 0)
  const paidAmount = debts.reduce((sum, d) => sum + d.paidAmount, 0)
  const outstandingDebt = totalDebt - paidAmount

  // Calculate debt utilization (assuming some credit limit)
  // For this, we'll use the ratio of paid to total as a proxy
  const paymentRatio = totalDebt > 0 ? (paidAmount / totalDebt) * 100 : 100

  // Score based on how much has been paid off
  let score: number
  if (totalDebt === 0) {
    score = 100 // No debt is good
  } else {
    score = paymentRatio
  }

  // Determine impact
  let impact: 'positive' | 'negative' | 'neutral'
  if (score >= 70) impact = 'positive'
  else if (score >= 40) impact = 'neutral'
  else impact = 'negative'

  // Generate description
  const description = totalDebt > 0
    ? `${Math.round(paymentRatio)}% of debt paid (${formatCurrency(paidAmount)} / ${formatCurrency(totalDebt)})`
    : 'No outstanding debt'

  // Generate suggestion
  let suggestion: string | undefined
  if (outstandingDebt > 0 && impact === 'negative') {
    suggestion = 'Pay down existing debt to improve your credit score'
  }

  return {
    name: 'Outstanding Debt',
    weight: FACTOR_WEIGHTS.OUTSTANDING_DEBT,
    score,
    impact,
    description,
    suggestion,
    details: {
      totalDebt,
      paidAmount,
      outstandingDebt,
      debtCount: debts.length,
      paymentRatio: Math.round(paymentRatio)
    }
  }
}

/**
 * Calculate credit age factor (15% weight)
 */
export function getCreditAgeFactor(clientCreatedAt: Date): ScoringFactor {
  const now = new Date()
  const ageInMonths = Math.floor(
    (now.getTime() - new Date(clientCreatedAt).getTime()) / (1000 * 60 * 60 * 24 * 30)
  )

  // Score based on credit age
  let score: number
  if (ageInMonths >= 60) score = 100  // 5+ years is excellent
  else if (ageInMonths >= 36) score = 85  // 3-5 years
  else if (ageInMonths >= 24) score = 70  // 2-3 years
  else if (ageInMonths >= 12) score = 55  // 1-2 years
  else if (ageInMonths >= 6) score = 40   // 6-12 months
  else score = 25  // Less than 6 months

  // Determine impact
  let impact: 'positive' | 'negative' | 'neutral'
  if (score >= 70) impact = 'positive'
  else if (score >= 40) impact = 'neutral'
  else impact = 'negative'

  // Generate description
  const yearsDescription = ageInMonths >= 12
    ? `${Math.floor(ageInMonths / 12)} year(s) ${ageInMonths % 12} month(s)`
    : `${ageInMonths} month(s)`

  const description = `Credit history: ${yearsDescription}`

  // Generate suggestion
  let suggestion: string | undefined
  if (ageInMonths < 12) {
    suggestion = 'Continue building your credit history over time'
  }

  return {
    name: 'Credit Age',
    weight: FACTOR_WEIGHTS.CREDIT_AGE,
    score,
    impact,
    description,
    suggestion,
    details: {
      ageInMonths,
      years: Math.floor(ageInMonths / 12),
      months: ageInMonths % 12
    }
  }
}

/**
 * Calculate inquiry factor (10% weight)
 */
export async function getInquiryFactor(
  clientId: string,
  inquiryCount: number
): Promise<ScoringFactor> {
  // Get inquiries in the last 12 months
  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

  const recentInquiries = await db.creditInquiry.count({
    where: {
      clientId,
      createdAt: { gte: oneYearAgo }
    }
  })

  // Score based on number of recent inquiries
  // More inquiries = lower score (indicates credit seeking behavior)
  let score: number
  if (recentInquiries === 0) score = 100
  else if (recentInquiries === 1) score = 90
  else if (recentInquiries === 2) score = 80
  else if (recentInquiries === 3) score = 65
  else if (recentInquiries === 4) score = 50
  else if (recentInquiries === 5) score = 35
  else score = 20

  // Determine impact
  let impact: 'positive' | 'negative' | 'neutral'
  if (score >= 80) impact = 'positive'
  else if (score >= 50) impact = 'neutral'
  else impact = 'negative'

  // Generate description
  const description = recentInquiries === 0
    ? 'No recent credit inquiries'
    : `${recentInquiries} credit ${recentInquiries === 1 ? 'inquiry' : 'inquiries'} in the last 12 months`

  // Generate suggestion
  let suggestion: string | undefined
  if (recentInquiries > 3) {
    suggestion = 'Limit credit applications to improve your score'
  }

  return {
    name: 'New Inquiries',
    weight: FACTOR_WEIGHTS.NEW_INQUIRIES,
    score,
    impact,
    description,
    suggestion,
    details: {
      totalInquiries: inquiryCount,
      recentInquiries
    }
  }
}

/**
 * Calculate credit mix factor (10% weight)
 */
export function getCreditMixFactor(debts: Array<{
  amount: number
  status: string
  reference?: string | null
}>): ScoringFactor {
  // Analyze types of debts/credits
  const debtTypes = new Set<string>()
  
  for (const debt of debts) {
    // Categorize debt types based on reference patterns or amounts
    if (debt.reference?.startsWith('INV')) debtTypes.add('invoice')
    if (debt.reference?.startsWith('LOAN')) debtTypes.add('loan')
    if (debt.reference?.startsWith('CRD')) debtTypes.add('credit_line')
    if (debt.amount > 1000000) debtTypes.add('large_credit')
    if (debt.amount < 100000 && debt.amount > 0) debtTypes.add('small_credit')
  }

  // If no specific categorization, default to 'invoice' for debts
  if (debtTypes.size === 0 && debts.length > 0) {
    debtTypes.add('invoice')
  }

  const uniqueTypes = debtTypes.size

  // Score based on credit mix diversity
  let score: number
  if (uniqueTypes >= 4) score = 100
  else if (uniqueTypes === 3) score = 85
  else if (uniqueTypes === 2) score = 70
  else if (uniqueTypes === 1) score = 50
  else score = 30 // No credit history

  // Determine impact
  let impact: 'positive' | 'negative' | 'neutral'
  if (score >= 70) impact = 'positive'
  else if (score >= 50) impact = 'neutral'
  else impact = 'negative'

  // Generate description
  const typeNames = Array.from(debtTypes).join(', ')
  const description = uniqueTypes > 0
    ? `${uniqueTypes} credit ${uniqueTypes === 1 ? 'type' : 'types'}: ${typeNames || 'invoices'}`
    : 'No credit types recorded'

  // Generate suggestion
  let suggestion: string | undefined
  if (uniqueTypes < 2) {
    suggestion = 'A diverse credit mix can help improve your score'
  }

  return {
    name: 'Credit Mix',
    weight: FACTOR_WEIGHTS.CREDIT_MIX,
    score,
    impact,
    description,
    suggestion,
    details: {
      uniqueTypes,
      types: Array.from(debtTypes)
    }
  }
}

/**
 * Update client credit score in database
 */
export async function updateClientCreditScore(clientId: string): Promise<CreditScoreResult> {
  const result = await calculateCreditScore(clientId)

  // Update client record
  await db.client.update({
    where: { id: clientId },
    data: {
      creditScore: result.score,
      creditRating: result.rating,
      lastCreditReview: new Date()
    }
  })

  return result
}

/**
 * Record payment history
 */
export async function recordPaymentHistory(
  clientId: string,
  debtId: string,
  amount: number,
  dueDate: Date,
  paidDate: Date | null
): Promise<void> {
  const daysLate = paidDate
    ? Math.max(0, Math.floor((paidDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)))
    : Math.max(0, Math.floor((new Date().getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)))

  const status = getPaymentStatusFromDaysLate(daysLate)

  await db.paymentHistory.create({
    data: {
      clientId,
      debtId,
      amount,
      dueDate,
      paidDate,
      daysLate,
      status
    }
  })

  // Update payment history JSON on client
  const history = await db.paymentHistory.findMany({
    where: { clientId },
    orderBy: { dueDate: 'desc' },
    take: 12
  })

  const paymentHistoryJson = JSON.stringify(history.map(h => ({
    amount: h.amount,
    dueDate: h.dueDate,
    paidDate: h.paidDate,
    daysLate: h.daysLate,
    status: h.status
  })))

  await db.client.update({
    where: { id: clientId },
    data: {
      paymentHistory: paymentHistoryJson
    }
  })
}

/**
 * Get risk level from rating
 */
function getRiskLevelFromRating(rating: CreditRating): 'low' | 'medium' | 'high' {
  if (['AAA', 'AA', 'A', 'BBB'].includes(rating)) return 'low'
  if (['BB', 'B'].includes(rating)) return 'medium'
  return 'high'
}

/**
 * Generate recommendation based on factors
 */
function generateRecommendation(factors: ScoringFactor[], rating: CreditRating): string {
  const negativeFactors = factors.filter(f => f.impact === 'negative')
  
  if (negativeFactors.length === 0) {
    return 'Excellent credit profile. Continue maintaining good payment habits.'
  }

  // Find the most impactful negative factor
  const worstFactor = negativeFactors.reduce((worst, current) => 
    (current.weight > worst.weight) ? current : worst
  )

  return worstFactor.suggestion || 'Focus on improving your payment history to increase your credit score.'
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-GN', {
    style: 'currency',
    currency: 'GNF',
    maximumFractionDigits: 0
  }).format(amount)
}

/**
 * Get score rating from rating string
 */
export function getScoreRating(score: number): CreditRating {
  return getRatingFromScore(score)
}
