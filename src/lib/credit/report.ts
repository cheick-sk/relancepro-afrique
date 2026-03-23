/**
 * Credit Report Generation
 * RelancePro Africa - Comprehensive Credit Scoring Module
 */

import { db } from '@/lib/db'
import { calculateCreditScore, updateClientCreditScore, type CreditScoreResult } from './scoring'
import {
  type CreditRating,
  type ScoringFactor,
  getRatingFromScore,
  getRiskLevel,
  calculateCreditLimit,
  CREDIT_RATINGS,
} from './factors'

// Types
export interface CreditReportData {
  id: string
  clientId: string
  clientName: string
  clientEmail: string | null
  clientPhone: string | null
  clientCompany: string | null
  score: number
  rating: CreditRating
  ratingLabel: string
  riskLevel: {
    level: string
    color: string
    description: string
  }
  factors: ScoringFactor[]
  recommendations: CreditRecommendation[]
  paymentHistory: PaymentHistoryEntry[]
  outstandingDebts: OutstandingDebt[]
  creditLimit: number
  validUntil: Date
  generatedAt: Date
  trend: CreditTrend | null
}

export interface CreditRecommendation {
  priority: 'high' | 'medium' | 'low'
  category: string
  title: string
  description: string
  action: string
  potentialImpact: string
}

export interface PaymentHistoryEntry {
  id: string
  amount: number
  dueDate: Date
  paidDate: Date | null
  daysLate: number
  status: string
  debtReference?: string
}

export interface OutstandingDebt {
  id: string
  reference: string | null
  description: string | null
  amount: number
  paidAmount: number
  remainingAmount: number
  dueDate: Date
  daysOverdue: number
  status: string
}

export interface CreditTrend {
  currentScore: number
  previousScore: number | null
  change: number
  direction: 'up' | 'down' | 'stable'
  history: Array<{
    date: Date
    score: number
  }>
}

/**
 * Generate comprehensive credit report for a client
 */
export async function generateCreditReport(clientId: string): Promise<CreditReportData> {
  // Get client with all related data
  const client = await db.client.findUnique({
    where: { id: clientId },
    include: {
      debts: {
        where: {
          status: { in: ['pending', 'partial'] }
        },
        orderBy: { dueDate: 'asc' }
      },
      paymentHistoryRecords: {
        orderBy: { dueDate: 'desc' },
        take: 24
      },
      creditReports: {
        orderBy: { createdAt: 'desc' },
        take: 5
      },
      profile: true
    }
  })

  if (!client) {
    throw new Error('Client not found')
  }

  // Calculate current credit score
  const scoreResult = await calculateCreditScore(clientId)
  
  // Update client's credit score
  await updateClientCreditScore(clientId)

  // Generate recommendations
  const recommendations = await getCreditRecommendations(clientId, scoreResult)

  // Format payment history
  const paymentHistory: PaymentHistoryEntry[] = (client.paymentHistoryRecords || []).map(record => ({
    id: record.id,
    amount: record.amount,
    dueDate: record.dueDate,
    paidDate: record.paidDate,
    daysLate: record.daysLate,
    status: record.status,
    debtReference: record.debtId || undefined
  }))

  // Format outstanding debts
  const outstandingDebts: OutstandingDebt[] = (client.debts || []).map(debt => {
    const remainingAmount = debt.amount - debt.paidAmount
    const daysOverdue = Math.max(0, Math.floor(
      (new Date().getTime() - new Date(debt.dueDate).getTime()) / (1000 * 60 * 60 * 24)
    ))

    return {
      id: debt.id,
      reference: debt.reference,
      description: debt.description,
      amount: debt.amount,
      paidAmount: debt.paidAmount,
      remainingAmount,
      dueDate: debt.dueDate,
      daysOverdue,
      status: debt.status
    }
  })

  // Calculate recommended credit limit
  const totalOutstanding = outstandingDebts.reduce((sum, d) => sum + d.remainingAmount, 0)
  const creditLimit = calculateCreditLimit(scoreResult.score, undefined, totalOutstanding)

  // Calculate trend
  const trend = await compareCreditTrend(clientId, scoreResult.score, client.creditReports || [])

  // Set validity (90 days from now)
  const validUntil = new Date()
  validUntil.setDate(validUntil.getDate() + 90)

  // Create report in database
  const report = await db.creditReport.create({
    data: {
      profileId: client.profileId,
      clientId,
      score: scoreResult.score,
      rating: scoreResult.rating,
      factors: JSON.stringify(scoreResult.factors),
      recommendations: JSON.stringify(recommendations),
      validUntil
    }
  })

  return {
    id: report.id,
    clientId,
    clientName: client.name,
    clientEmail: client.email,
    clientPhone: client.phone,
    clientCompany: client.company,
    score: scoreResult.score,
    rating: scoreResult.rating,
    ratingLabel: CREDIT_RATINGS[scoreResult.rating].label,
    riskLevel: getRiskLevel(scoreResult.rating),
    factors: scoreResult.factors,
    recommendations,
    paymentHistory,
    outstandingDebts,
    creditLimit,
    validUntil,
    generatedAt: report.createdAt,
    trend
  }
}

/**
 * Generate AI-powered credit recommendations
 */
export async function getCreditRecommendations(
  clientId: string,
  scoreResult: CreditScoreResult
): Promise<CreditRecommendation[]> {
  const recommendations: CreditRecommendation[] = []

  // Analyze factors and generate recommendations
  for (const factor of scoreResult.factors) {
    if (factor.impact === 'negative') {
      const recommendation = generateFactorRecommendation(factor, scoreResult.rating)
      if (recommendation) {
        recommendations.push(recommendation)
      }
    }
  }

  // Add general recommendations based on rating
  if (scoreResult.rating === 'D' || scoreResult.rating === 'C' || scoreResult.rating === 'CC') {
    recommendations.unshift({
      priority: 'high',
      category: 'Critical',
      title: 'Immediate Action Required',
      description: 'Your credit score is critically low. Take immediate action to avoid default status.',
      action: 'Contact creditors to negotiate payment plans and prioritize paying off overdue debts.',
      potentialImpact: 'Could improve score by 100+ points within 6 months'
    })
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 }
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

  return recommendations.slice(0, 5) // Return top 5 recommendations
}

/**
 * Generate recommendation for a specific factor
 */
function generateFactorRecommendation(
  factor: ScoringFactor,
  rating: CreditRating
): CreditRecommendation | null {
  const priority = factor.weight >= 30 ? 'high' : factor.weight >= 15 ? 'medium' : 'low'

  switch (factor.name) {
    case 'Payment History':
      return {
        priority,
        category: 'Payment History',
        title: 'Improve Payment Timeliness',
        description: factor.description,
        action: 'Set up payment reminders and consider automatic payments for recurring debts.',
        potentialImpact: 'On-time payments for 6 months can improve score by 50-100 points'
      }

    case 'Outstanding Debt':
      return {
        priority,
        category: 'Debt Management',
        title: 'Reduce Outstanding Debt',
        description: factor.description,
        action: 'Create a debt repayment plan. Consider the snowball method (smallest debts first) or avalanche method (highest interest first).',
        potentialImpact: 'Reducing debt by 50% can improve score by 30-50 points'
      }

    case 'Credit Age':
      return {
        priority: 'low',
        category: 'Credit History',
        title: 'Build Credit History',
        description: factor.description,
        action: 'Keep old credit accounts open and active. Time is the main factor here.',
        potentialImpact: 'Credit age naturally improves over time'
      }

    case 'New Inquiries':
      return {
        priority: 'medium',
        category: 'Credit Applications',
        title: 'Limit Credit Applications',
        description: factor.description,
        action: 'Avoid applying for new credit unless necessary. Each inquiry can temporarily lower your score.',
        potentialImpact: 'Inquiries fall off after 12 months, naturally improving this factor'
      }

    case 'Credit Mix':
      return {
        priority: 'low',
        category: 'Credit Diversity',
        title: 'Diversify Credit Types',
        description: factor.description,
        action: 'Consider different types of credit (installment loans, revolving credit) when appropriate.',
        potentialImpact: 'Can improve score by 10-20 points over time'
      }

    default:
      return null
  }
}

/**
 * Compare credit trend over time
 */
export async function compareCreditTrend(
  clientId: string,
  currentScore: number,
  previousReports: Array<{
    score: number
    createdAt: Date
  }>
): Promise<CreditTrend | null> {
  if (previousReports.length === 0) {
    return null
  }

  const previousScore = previousReports[0].score
  const change = currentScore - previousScore

  let direction: 'up' | 'down' | 'stable'
  if (change > 10) direction = 'up'
  else if (change < -10) direction = 'down'
  else direction = 'stable'

  const history = previousReports.slice(0, 5).map(report => ({
    date: report.createdAt,
    score: report.score
  }))

  // Add current score
  history.unshift({
    date: new Date(),
    score: currentScore
  })

  return {
    currentScore,
    previousScore,
    change,
    direction,
    history
  }
}

/**
 * Get latest credit report for a client
 */
export async function getLatestCreditReport(clientId: string): Promise<CreditReportData | null> {
  const report = await db.creditReport.findFirst({
    where: { clientId },
    orderBy: { createdAt: 'desc' },
    include: {
      client: true
    }
  })

  if (!report) {
    return null
  }

  // Check if report is still valid
  const isValid = !report.validUntil || new Date(report.validUntil) > new Date()

  if (!isValid) {
    // Generate new report
    return generateCreditReport(clientId)
  }

  // Return existing report data
  const factors: ScoringFactor[] = report.factors ? JSON.parse(report.factors) : []
  const recommendations: CreditRecommendation[] = report.recommendations ? JSON.parse(report.recommendations) : []

  return {
    id: report.id,
    clientId: report.clientId,
    clientName: report.client.name,
    clientEmail: report.client.email,
    clientPhone: report.client.phone,
    clientCompany: report.client.company,
    score: report.score,
    rating: report.rating as CreditRating,
    ratingLabel: CREDIT_RATINGS[report.rating as CreditRating]?.label || 'Unknown',
    riskLevel: getRiskLevel(report.rating as CreditRating),
    factors,
    recommendations,
    paymentHistory: [],
    outstandingDebts: [],
    creditLimit: 0,
    validUntil: report.validUntil || new Date(),
    generatedAt: report.createdAt,
    trend: null
  }
}

/**
 * Create credit inquiry
 */
export async function createCreditInquiry(
  profileId: string,
  clientId: string,
  inquiredBy: string | null,
  reason: string,
  consentGiven: boolean
): Promise<void> {
  // Create inquiry record
  await db.creditInquiry.create({
    data: {
      profileId,
      clientId,
      inquiredBy,
      reason,
      consentGiven
    }
  })

  // Increment inquiry count on client
  await db.client.update({
    where: { id: clientId },
    data: {
      creditInquiries: { increment: 1 }
    }
  })
}

/**
 * Get credit inquiries for a client
 */
export async function getCreditInquiries(clientId: string): Promise<Array<{
  id: string
  reason: string | null
  consentGiven: boolean
  createdAt: Date
  inquirer?: {
    name: string | null
    email: string
  }
}>> {
  const inquiries = await db.creditInquiry.findMany({
    where: { clientId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      profile: true
    }
  })

  return inquiries.map(inquiry => ({
    id: inquiry.id,
    reason: inquiry.reason,
    consentGiven: inquiry.consentGiven,
    createdAt: inquiry.createdAt,
    inquirer: inquiry.inquiredBy ? {
      name: inquiry.profile.name,
      email: inquiry.profile.email
    } : undefined
  }))
}

/**
 * Generate credit summary for dashboard
 */
export async function getCreditSummary(profileId: string): Promise<{
  totalClients: number
  clientsWithScore: number
  averageScore: number
  ratingDistribution: Record<CreditRating, number>
  highRiskCount: number
  recentInquiries: number
}> {
  const clients = await db.client.findMany({
    where: { profileId },
    select: {
      creditScore: true,
      creditRating: true
    }
  })

  const totalClients = clients.length
  const clientsWithScore = clients.filter(c => c.creditScore !== null).length
  const scores = clients.filter(c => c.creditScore !== null).map(c => c.creditScore as number)
  const averageScore = scores.length > 0 
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0

  // Rating distribution
  const ratingDistribution: Record<CreditRating, number> = {
    AAA: 0, AA: 0, A: 0, BBB: 0, BB: 0, B: 0, CCC: 0, CC: 0, C: 0, D: 0
  }

  for (const client of clients) {
    if (client.creditRating && client.creditRating in ratingDistribution) {
      ratingDistribution[client.creditRating as CreditRating]++
    }
  }

  // High risk count (ratings CCC and below)
  const highRiskCount = clients.filter(c => 
    c.creditRating && ['CCC', 'CC', 'C', 'D'].includes(c.creditRating)
  ).length

  // Recent inquiries (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const recentInquiries = await db.creditInquiry.count({
    where: {
      profileId,
      createdAt: { gte: thirtyDaysAgo }
    }
  })

  return {
    totalClients,
    clientsWithScore,
    averageScore,
    ratingDistribution,
    highRiskCount,
    recentInquiries
  }
}
