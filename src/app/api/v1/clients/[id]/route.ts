/**
 * Client Detail API - Get, Update, Delete
 * GET /api/v1/clients/[id] - Get client details
 * PUT /api/v1/clients/[id] - Update client
 * DELETE /api/v1/clients/[id] - Delete client
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
  const authResult = await requireScope(request, 'clients:read' as ApiScope)
  
  if ('error' in authResult) {
    return authResult.error
  }
  
  const { apiKey } = authResult
  const { id } = await params
  
  try {
    const client = await db.client.findFirst({
      where: {
        id,
        profileId: apiKey.profileId,
      },
      include: {
        debts: {
          select: {
            id: true,
            reference: true,
            amount: true,
            currency: true,
            status: true,
            dueDate: true,
            paidAmount: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        reminders: {
          select: {
            id: true,
            type: true,
            status: true,
            sentAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        _count: {
          select: {
            debts: true,
            reminders: true,
          },
        },
      },
    })
    
    if (!client) {
      await logApiUsage(apiKey.id, request, 404, Date.now() - startTime)
      return notFoundResponse('Client', id)
    }
    
    // Calculate client statistics
    const totalDebt = client.debts.reduce((sum, d) => sum + d.amount, 0)
    const paidDebt = client.debts.reduce((sum, d) => sum + d.paidAmount, 0)
    const pendingDebts = client.debts.filter(d => d.status === 'pending').length
    
    // Log usage
    await logApiUsage(apiKey.id, request, 200, Date.now() - startTime)
    
    return successResponse({
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      company: client.company,
      address: client.address,
      notes: client.notes,
      riskScore: client.riskScore,
      riskLevel: client.riskLevel,
      status: client.status,
      statistics: {
        totalDebts: client._count.debts,
        totalReminders: client._count.reminders,
        totalDebt,
        paidDebt,
        remainingDebt: totalDebt - paidDebt,
        pendingDebts,
      },
      recentDebts: client.debts,
      recentReminders: client.reminders,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
    })
    
  } catch (error) {
    console.error('Error getting client:', error)
    await logApiUsage(apiKey.id, request, 500, Date.now() - startTime, 'Internal server error')
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to get client', undefined, 500)
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  const startTime = Date.now()
  
  // Authenticate and check scope
  const authResult = await requireScope(request, 'clients:write' as ApiScope)
  
  if ('error' in authResult) {
    return authResult.error
  }
  
  const { apiKey } = authResult
  const { id } = await params
  
  try {
    // Check if client exists and belongs to user
    const existingClient = await db.client.findFirst({
      where: {
        id,
        profileId: apiKey.profileId,
      },
    })
    
    if (!existingClient) {
      await logApiUsage(apiKey.id, request, 404, Date.now() - startTime)
      return notFoundResponse('Client', id)
    }
    
    const body = await request.json()
    
    // Validate email format if provided
    if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return validationErrorResponse('Validation failed', { email: 'Invalid email format' })
    }
    
    // Validate phone format if provided
    if (body.phone && !/^[\d\s\-+()]+$/.test(body.phone)) {
      return validationErrorResponse('Validation failed', { phone: 'Invalid phone format' })
    }
    
    // Check for duplicate email if changing email
    if (body.email && body.email !== existingClient.email) {
      const duplicate = await db.client.findFirst({
        where: {
          profileId: apiKey.profileId,
          email: body.email,
          id: { not: id },
        },
      })
      
      if (duplicate) {
        return errorResponse(
          ErrorCodes.ALREADY_EXISTS,
          'A client with this email already exists',
          { email: body.email },
          409
        )
      }
    }
    
    // Update client
    const client = await db.client.update({
      where: { id },
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone,
        company: body.company,
        address: body.address,
        notes: body.notes,
        status: body.status,
      },
    })
    
    // Log usage
    await logApiUsage(apiKey.id, request, 200, Date.now() - startTime)
    
    return successResponse({
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      company: client.company,
      address: client.address,
      notes: client.notes,
      status: client.status,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
    })
    
  } catch (error) {
    console.error('Error updating client:', error)
    await logApiUsage(apiKey.id, request, 500, Date.now() - startTime, 'Internal server error')
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to update client', undefined, 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  const startTime = Date.now()
  
  // Authenticate and check scope
  const authResult = await requireScope(request, 'clients:write' as ApiScope)
  
  if ('error' in authResult) {
    return authResult.error
  }
  
  const { apiKey } = authResult
  const { id } = await params
  
  try {
    // Check if client exists and belongs to user
    const existingClient = await db.client.findFirst({
      where: {
        id,
        profileId: apiKey.profileId,
      },
      include: {
        _count: {
          select: { debts: true },
        },
      },
    })
    
    if (!existingClient) {
      await logApiUsage(apiKey.id, request, 404, Date.now() - startTime)
      return notFoundResponse('Client', id)
    }
    
    // Check if client has debts
    if (existingClient._count.debts > 0) {
      return errorResponse(
        ErrorCodes.CONFLICT,
        'Cannot delete client with existing debts. Delete debts first or set client to inactive.',
        { debtsCount: existingClient._count.debts },
        409
      )
    }
    
    // Delete client
    await db.client.delete({
      where: { id },
    })
    
    // Log usage
    await logApiUsage(apiKey.id, request, 204, Date.now() - startTime)
    
    return noContentResponse()
    
  } catch (error) {
    console.error('Error deleting client:', error)
    await logApiUsage(apiKey.id, request, 500, Date.now() - startTime, 'Internal server error')
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to delete client', undefined, 500)
  }
}
