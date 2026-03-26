/**
 * Debts API - List and Create
 * GET /api/v1/debts - List debts (paginated, filterable)
 * POST /api/v1/debts - Create a new debt
 */

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { 
  successResponse, 
  paginatedResponse, 
  createdResponse,
  errorResponse,
  validationErrorResponse,
  ErrorCodes,
  getPaginationParams,
  getFilterParams,
} from '@/lib/api/response'
import { 
  requireScope, 
  logApiUsage,
  type ApiScope 
} from '@/lib/api/auth'

// Allowed filter params for debts
const ALLOWED_FILTERS = ['status', 'clientId', 'currency', 'overdue'] as const
type DebtFilter = typeof ALLOWED_FILTERS[number]

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  // Authenticate and check scope
  const authResult = await requireScope(request, 'debts:read' as ApiScope)
  
  if ('error' in authResult) {
    return authResult.error
  }
  
  const { apiKey } = authResult
  
  try {
    const { searchParams } = new URL(request.url)
    const { page, perPage, offset } = getPaginationParams(searchParams)
    const filters = getFilterParams<DebtFilter>(searchParams, [...ALLOWED_FILTERS])
    
    // Build where clause
    const where: Record<string, unknown> = {
      profileId: apiKey.profileId,
    }
    
    if (filters.status) {
      where.status = filters.status
    }
    
    if (filters.clientId) {
      where.clientId = filters.clientId
    }
    
    if (filters.currency) {
      where.currency = filters.currency
    }
    
    if (filters.overdue === 'true') {
      where.status = 'pending'
      where.dueDate = { lt: new Date() }
    }
    
    // Get total count
    const total = await db.debt.count({ where })
    
    // Get debts
    const debts = await db.debt.findMany({
      where,
      skip: offset,
      take: perPage,
      orderBy: { createdAt: 'desc' },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            company: true,
          },
        },
      },
    })
    
    // Format response
    const formattedDebts = debts.map(debt => ({
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
      reminderCount: debt.reminderCount,
      lastReminderAt: debt.lastReminderAt,
      paymentProbability: debt.paymentProbability,
      predictedPayDate: debt.predictedPayDate,
      client: debt.client,
      createdAt: debt.createdAt,
      updatedAt: debt.updatedAt,
    }))
    
    // Log usage
    await logApiUsage(apiKey.id, request, 200, Date.now() - startTime)
    
    return paginatedResponse(formattedDebts, {
      page,
      perPage,
      total,
      baseUrl: '/api/v1/debts',
    })
    
  } catch (error) {
    console.error('Error listing debts:', error)
    await logApiUsage(apiKey.id, request, 500, Date.now() - startTime, 'Internal server error')
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to list debts', undefined, 500)
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  // Authenticate and check scope
  const authResult = await requireScope(request, 'debts:write' as ApiScope)
  
  if ('error' in authResult) {
    return authResult.error
  }
  
  const { apiKey } = authResult
  
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.clientId) {
      return validationErrorResponse('Validation failed', { clientId: 'Client ID is required' })
    }
    
    if (!body.amount || body.amount <= 0) {
      return validationErrorResponse('Validation failed', { amount: 'Amount must be greater than 0' })
    }
    
    if (!body.dueDate) {
      return validationErrorResponse('Validation failed', { dueDate: 'Due date is required' })
    }
    
    // Check if client exists and belongs to user
    const client = await db.client.findFirst({
      where: {
        id: body.clientId,
        profileId: apiKey.profileId,
      },
    })
    
    if (!client) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Client not found',
        { clientId: body.clientId },
        404
      )
    }
    
    // Parse due date
    const dueDate = new Date(body.dueDate)
    if (isNaN(dueDate.getTime())) {
      return validationErrorResponse('Validation failed', { dueDate: 'Invalid date format' })
    }
    
    // Create debt
    const debt = await db.debt.create({
      data: {
        clientId: body.clientId,
        profileId: apiKey.profileId,
        reference: body.reference,
        description: body.description,
        amount: parseFloat(body.amount),
        currency: body.currency || 'GNF',
        dueDate,
        issueDate: body.issueDate ? new Date(body.issueDate) : null,
        status: body.status || 'pending',
        autoRemindEnabled: body.autoRemindEnabled !== false,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    })
    
    // Log usage
    await logApiUsage(apiKey.id, request, 201, Date.now() - startTime)
    
    return createdResponse({
      id: debt.id,
      reference: debt.reference,
      description: debt.description,
      amount: debt.amount,
      currency: debt.currency,
      status: debt.status,
      dueDate: debt.dueDate,
      issueDate: debt.issueDate,
      client: debt.client,
      createdAt: debt.createdAt,
      updatedAt: debt.updatedAt,
    }, `/api/v1/debts/${debt.id}`)
    
  } catch (error) {
    console.error('Error creating debt:', error)
    await logApiUsage(apiKey.id, request, 500, Date.now() - startTime, 'Internal server error')
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to create debt', undefined, 500)
  }
}
