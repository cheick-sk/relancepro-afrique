/**
 * Clients API - List and Create
 * GET /api/v1/clients - List clients (paginated, filterable)
 * POST /api/v1/clients - Create a new client
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

// Allowed filter params for clients
const ALLOWED_FILTERS = ['status', 'riskLevel', 'search'] as const
type ClientFilter = typeof ALLOWED_FILTERS[number]

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  // Authenticate and check scope
  const authResult = await requireScope(request, 'clients:read' as ApiScope)
  
  if ('error' in authResult) {
    return authResult.error
  }
  
  const { apiKey } = authResult
  
  try {
    const { searchParams } = new URL(request.url)
    const { page, perPage, offset } = getPaginationParams(searchParams)
    const filters = getFilterParams<ClientFilter>(searchParams, [...ALLOWED_FILTERS])
    
    // Build where clause
    const where: Record<string, unknown> = {
      profileId: apiKey.profileId,
    }
    
    if (filters.status) {
      where.status = filters.status
    }
    
    if (filters.riskLevel) {
      where.riskLevel = filters.riskLevel
    }
    
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { email: { contains: filters.search } },
        { phone: { contains: filters.search } },
        { company: { contains: filters.search } },
      ]
    }
    
    // Get total count
    const total = await db.client.count({ where })
    
    // Get clients
    const clients = await db.client.findMany({
      where,
      skip: offset,
      take: perPage,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { debts: true },
        },
      },
    })
    
    // Format response
    const formattedClients = clients.map(client => ({
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
      debtsCount: client._count.debts,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
    }))
    
    // Log usage
    await logApiUsage(apiKey.id, request, 200, Date.now() - startTime)
    
    return paginatedResponse(formattedClients, {
      page,
      perPage,
      total,
      baseUrl: '/api/v1/clients',
    })
    
  } catch (error) {
    console.error('Error listing clients:', error)
    await logApiUsage(apiKey.id, request, 500, Date.now() - startTime, 'Internal server error')
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to list clients', undefined, 500)
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  // Authenticate and check scope
  const authResult = await requireScope(request, 'clients:write' as ApiScope)
  
  if ('error' in authResult) {
    return authResult.error
  }
  
  const { apiKey } = authResult
  
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.name) {
      return validationErrorResponse('Validation failed', { name: 'Name is required' })
    }
    
    // Validate email format if provided
    if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return validationErrorResponse('Validation failed', { email: 'Invalid email format' })
    }
    
    // Validate phone format if provided (basic validation)
    if (body.phone && !/^[\d\s\-+()]+$/.test(body.phone)) {
      return validationErrorResponse('Validation failed', { phone: 'Invalid phone format' })
    }
    
    // Check for duplicate email
    if (body.email) {
      const existing = await db.client.findFirst({
        where: {
          profileId: apiKey.profileId,
          email: body.email,
        },
      })
      
      if (existing) {
        return errorResponse(
          ErrorCodes.ALREADY_EXISTS,
          'A client with this email already exists',
          { email: body.email },
          409
        )
      }
    }
    
    // Create client
    const client = await db.client.create({
      data: {
        profileId: apiKey.profileId,
        name: body.name,
        email: body.email || null,
        phone: body.phone || null,
        company: body.company || null,
        address: body.address || null,
        notes: body.notes || null,
        status: body.status || 'active',
      },
    })
    
    // Log usage
    await logApiUsage(apiKey.id, request, 201, Date.now() - startTime)
    
    return createdResponse({
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
    }, `/api/v1/clients/${client.id}`)
    
  } catch (error) {
    console.error('Error creating client:', error)
    await logApiUsage(apiKey.id, request, 500, Date.now() - startTime, 'Internal server error')
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to create client', undefined, 500)
  }
}
