/**
 * Analytics API - Get analytics summary
 * GET /api/v1/analytics - Get analytics summary with date range filtering
 */

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { 
  successResponse, 
  errorResponse,
  ErrorCodes,
} from '@/lib/api/response'
import { 
  requireScope, 
  logApiUsage,
  type ApiScope 
} from '@/lib/api/auth'

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  // Authenticate and check scope
  const authResult = await requireScope(request, 'analytics:read' as ApiScope)
  
  if ('error' in authResult) {
    return authResult.error
  }
  
  const { apiKey } = authResult
  
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse date range
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    
    let startDate = startDateParam ? new Date(startDateParam) : new Date()
    let endDate = endDateParam ? new Date(endDateParam) : new Date()
    
    // Default to last 30 days if no range provided
    if (!startDateParam) {
      startDate.setDate(startDate.getDate() - 30)
    }
    
    // Set time bounds
    startDate.setHours(0, 0, 0, 0)
    endDate.setHours(23, 59, 59, 999)
    
    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return errorResponse(
        ErrorCodes.BAD_REQUEST,
        'Invalid date format. Use ISO 8601 format (YYYY-MM-DD)',
        undefined,
        400
      )
    }
    
    // Get clients stats
    const [
      totalClients,
      activeClients,
      newClients,
    ] = await Promise.all([
      db.client.count({ where: { profileId: apiKey.profileId } }),
      db.client.count({ 
        where: { profileId: apiKey.profileId, status: 'active' } 
      }),
      db.client.count({
        where: {
          profileId: apiKey.profileId,
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
    ])
    
    // Get debts stats
    const debts = await db.debt.findMany({
      where: {
        profileId: apiKey.profileId,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        amount: true,
        paidAmount: true,
        status: true,
        currency: true,
        createdAt: true,
      },
    })
    
    const totalDebts = debts.length
    const totalDebtAmount = debts.reduce((sum, d) => sum + d.amount, 0)
    const totalPaidAmount = debts.reduce((sum, d) => sum + d.paidAmount, 0)
    const pendingDebts = debts.filter(d => d.status === 'pending').length
    const paidDebts = debts.filter(d => d.status === 'paid').length
    const partialDebts = debts.filter(d => d.status === 'partial').length
    
    // Get reminders stats
    const reminders = await db.reminder.findMany({
      where: {
        profileId: apiKey.profileId,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        type: true,
        status: true,
        createdAt: true,
      },
    })
    
    const totalReminders = reminders.length
    const emailReminders = reminders.filter(r => r.type === 'email').length
    const whatsappReminders = reminders.filter(r => r.type === 'whatsapp').length
    const sentReminders = reminders.filter(r => r.status === 'sent').length
    const deliveredReminders = reminders.filter(r => r.status === 'delivered').length
    const failedReminders = reminders.filter(r => r.status === 'failed').length
    
    // Get overdue debts
    const overdueDebts = await db.debt.count({
      where: {
        profileId: apiKey.profileId,
        status: 'pending',
        dueDate: { lt: new Date() },
      },
    })
    
    // Calculate recovery rate
    const recoveryRate = totalDebtAmount > 0 
      ? (totalPaidAmount / totalDebtAmount) * 100 
      : 0
    
    // Get daily stats for the period
    const dailyStats = await getDailyStats(apiKey.profileId, startDate, endDate)
    
    // Get top debtors
    const topDebtors = await db.client.findMany({
      where: {
        profileId: apiKey.profileId,
        status: 'active',
      },
      include: {
        debts: {
          where: { status: { in: ['pending', 'partial'] } },
          select: { amount: true, paidAmount: true },
        },
      },
      take: 5,
    })
    
    const topDebtorsFormatted = topDebtors
      .map(client => ({
        id: client.id,
        name: client.name,
        company: client.company,
        totalDebt: client.debts.reduce((sum, d) => sum + d.amount, 0),
        totalPaid: client.debts.reduce((sum, d) => sum + d.paidAmount, 0),
        debtsCount: client.debts.length,
      }))
      .filter(c => c.totalDebt > 0)
      .sort((a, b) => (b.totalDebt - b.totalPaid) - (a.totalDebt - a.totalPaid))
      .slice(0, 5)
    
    // Log usage
    await logApiUsage(apiKey.id, request, 200, Date.now() - startTime)
    
    return successResponse({
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      clients: {
        total: totalClients,
        active: activeClients,
        new: newClients,
      },
      debts: {
        total: totalDebts,
        pending: pendingDebts,
        paid: paidDebts,
        partial: partialDebts,
        overdue: overdueDebts,
        totalAmount: totalDebtAmount,
        paidAmount: totalPaidAmount,
        remainingAmount: totalDebtAmount - totalPaidAmount,
        recoveryRate: Math.round(recoveryRate * 100) / 100,
      },
      reminders: {
        total: totalReminders,
        email: emailReminders,
        whatsapp: whatsappReminders,
        sent: sentReminders,
        delivered: deliveredReminders,
        failed: failedReminders,
        deliveryRate: totalReminders > 0 
          ? Math.round((deliveredReminders / totalReminders) * 100) 
          : 0,
      },
      dailyStats,
      topDebtors: topDebtorsFormatted,
    })
    
  } catch (error) {
    console.error('Error getting analytics:', error)
    await logApiUsage(apiKey.id, request, 500, Date.now() - startTime, 'Internal server error')
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to get analytics', undefined, 500)
  }
}

// Helper function to get daily stats
async function getDailyStats(
  profileId: string,
  startDate: Date,
  endDate: Date
) {
  const stats: Array<{
    date: string
    newClients: number
    newDebts: number
    remindersSent: number
    paymentsReceived: number
  }> = []
  
  // Generate all dates in range
  const currentDate = new Date(startDate)
  while (currentDate <= endDate) {
    const dayStart = new Date(currentDate)
    dayStart.setHours(0, 0, 0, 0)
    
    const dayEnd = new Date(currentDate)
    dayEnd.setHours(23, 59, 59, 999)
    
    // Get counts for the day
    const [newClients, newDebts, remindersSent, paymentsReceived] = await Promise.all([
      db.client.count({
        where: {
          profileId,
          createdAt: { gte: dayStart, lte: dayEnd },
        },
      }),
      db.debt.count({
        where: {
          profileId,
          createdAt: { gte: dayStart, lte: dayEnd },
        },
      }),
      db.reminder.count({
        where: {
          profileId,
          status: 'sent',
          sentAt: { gte: dayStart, lte: dayEnd },
        },
      }),
      db.clientPayment.count({
        where: {
          status: 'success',
          paidAt: { gte: dayStart, lte: dayEnd },
          client: { profileId },
        },
      }),
    ])
    
    stats.push({
      date: currentDate.toISOString().split('T')[0],
      newClients,
      newDebts,
      remindersSent,
      paymentsReceived,
    })
    
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  return stats
}
