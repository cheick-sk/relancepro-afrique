/**
 * Debt Detail API - Get, Update, Delete
 * GET /api/v1/debts/[id] - Get debt details
 * PUT /api/v1/debts/[id] - Update debt
 * DELETE /api/v1/debts/[id] - Delete debt
 */

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { 
  successResponse, 
  noContentResponse,
  notFoundResponse,
  errorResponse,
  validationErrorResponse,
  ErrorCodes,
} from '@/lib/api/response'
import { 
  requireScope, 
  logApiUsage,
  type ApiScope 
} from '@/lib/api/auth'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const startTime = Date.now()
  
  // Authenticate and check scope
  const authResult = await requireScope(request, 'debts:read' as ApiScope)
  
  if ('error' in authResult) {
    return authResult.error
  }
  
  const { apiKey } = authResult
  const { id } = await params
  
  try {
    const debt = await db.debt.findFirst({
      where: {
        id,
        profileId: apiKey.profileId,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            company: true,
            status: true,
          },
        },
        reminders: {
          select: {
            id: true,
            type: true,
            status: true,
            subject: true,
            sentAt: true,
            deliveredAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        clientPayments: {
          select: {
            id: true,
            amount: true,
            currency: true,
            status: true,
            paymentMethod: true,
            paidAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })
    
    if (!debt) {
      await logApiUsage(apiKey.id, request, 404, Date.now() - startTime)
      return notFoundResponse('Debt', id)
    }
    
    // Calculate days overdue
    const now = new Date()
    const dueDate = new Date(debt.dueDate)
    const daysOverdue = debt.status === 'pending' && dueDate < now
      ? Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0
    
    // Log usage
    await logApiUsage(apiKey.id, request, 200, Date.now() - startTime)
    
    return successResponse({
      id: debt.id,
      reference: debt.reference,
      description: debt.description,
      amount: debt.amount,
      currency: debt.currency,
      paidAmount: debt.paidAmount,
      remainingAmount: debt.amount - debt.paidAmount,
      status: debt.status,
      issueDate: debt.issueDate,
      dueDate: debt.dueDate,
      paidDate: debt.paidDate,
      daysOverdue,
      autoRemindEnabled: debt.autoRemindEnabled,
      reminderCount: debt.reminderCount,
      lastReminderAt: debt.lastReminderAt,
      nextReminderAt: debt.nextReminderAt,
      paymentProbability: debt.paymentProbability,
      predictedPayDate: debt.predictedPayDate,
      client: debt.client,
      reminders: debt.reminders,
      payments: debt.clientPayments,
      createdAt: debt.createdAt,
      updatedAt: debt.updatedAt,
    })
    
  } catch (error) {
    console.error('Error getting debt:', error)
    await logApiUsage(apiKey.id, request, 500, Date.now() - startTime, 'Internal server error')
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to get debt', undefined, 500)
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  const startTime = Date.now()
  
  // Authenticate and check scope
  const authResult = await requireScope(request, 'debts:write' as ApiScope)
  
  if ('error' in authResult) {
    return authResult.error
  }
  
  const { apiKey } = authResult
  const { id } = await params
  
  try {
    // Check if debt exists and belongs to user
    const existingDebt = await db.debt.findFirst({
      where: {
        id,
        profileId: apiKey.profileId,
      },
    })
    
    if (!existingDebt) {
      await logApiUsage(apiKey.id, request, 404, Date.now() - startTime)
      return notFoundResponse('Debt', id)
    }
    
    const body = await request.json()
    
    // Validate amount if provided
    if (body.amount !== undefined && body.amount <= 0) {
      return validationErrorResponse('Validation failed', { amount: 'Amount must be greater than 0' })
    }
    
    // Validate due date if provided
    if (body.dueDate) {
      const dueDate = new Date(body.dueDate)
      if (isNaN(dueDate.getTime())) {
        return validationErrorResponse('Validation failed', { dueDate: 'Invalid date format' })
      }
    }
    
    // Validate paid amount doesn't exceed total
    if (body.paidAmount !== undefined && body.paidAmount > (body.amount || existingDebt.amount)) {
      return validationErrorResponse('Validation failed', { paidAmount: 'Paid amount cannot exceed total amount' })
    }
    
    // Update debt
    const debt = await db.debt.update({
      where: { id },
      data: {
        reference: body.reference,
        description: body.description,
        amount: body.amount !== undefined ? parseFloat(body.amount) : undefined,
        currency: body.currency,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        issueDate: body.issueDate !== undefined ? (body.issueDate ? new Date(body.issueDate) : null) : undefined,
        status: body.status,
        paidAmount: body.paidAmount !== undefined ? parseFloat(body.paidAmount) : undefined,
        paidDate: body.paidDate !== undefined ? (body.paidDate ? new Date(body.paidDate) : null) : undefined,
        autoRemindEnabled: body.autoRemindEnabled,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })
    
    // Log usage
    await logApiUsage(apiKey.id, request, 200, Date.now() - startTime)
    
    return successResponse({
      id: debt.id,
      reference: debt.reference,
      description: debt.description,
      amount: debt.amount,
      currency: debt.currency,
      paidAmount: debt.paidAmount,
      remainingAmount: debt.amount - debt.paidAmount,
      status: debt.status,
      dueDate: debt.dueDate,
      issueDate: debt.issueDate,
      autoRemindEnabled: debt.autoRemindEnabled,
      client: debt.client,
      createdAt: debt.createdAt,
      updatedAt: debt.updatedAt,
    })
    
  } catch (error) {
    console.error('Error updating debt:', error)
    await logApiUsage(apiKey.id, request, 500, Date.now() - startTime, 'Internal server error')
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to update debt', undefined, 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  const startTime = Date.now()
  
  // Authenticate and check scope
  const authResult = await requireScope(request, 'debts:write' as ApiScope)
  
  if ('error' in authResult) {
    return authResult.error
  }
  
  const { apiKey } = authResult
  const { id } = await params
  
  try {
    // Check if debt exists and belongs to user
    const existingDebt = await db.debt.findFirst({
      where: {
        id,
        profileId: apiKey.profileId,
      },
    })
    
    if (!existingDebt) {
      await logApiUsage(apiKey.id, request, 404, Date.now() - startTime)
      return notFoundResponse('Debt', id)
    }
    
    // Delete debt (cascades to reminders, etc.)
    await db.debt.delete({
      where: { id },
    })
    
    // Log usage
    await logApiUsage(apiKey.id, request, 204, Date.now() - startTime)
    
    return noContentResponse()
    
  } catch (error) {
    console.error('Error deleting debt:', error)
    await logApiUsage(apiKey.id, request, 500, Date.now() - startTime, 'Internal server error')
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to delete debt', undefined, 500)
  }
}
