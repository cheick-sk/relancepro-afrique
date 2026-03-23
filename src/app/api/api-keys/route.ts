/**
 * API Keys Management - List and Create
 * GET /api/api-keys - List API keys for current user
 * POST /api/api-keys - Create a new API key
 */

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { 
  successResponse, 
  createdResponse,
  errorResponse,
  validationErrorResponse,
  ErrorCodes,
} from '@/lib/api/response'
import { createApiKey, type ApiScope } from '@/lib/api/auth'

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required', undefined, 401)
  }
  
  try {
    const keys = await db.apiKey.findMany({
      where: { profileId: session.user.id },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        rateLimit: true,
        lastUsedAt: true,
        usageCount: true,
        active: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    
    return successResponse({
      keys: keys.map(k => ({
        ...k,
        scopes: JSON.parse(k.scopes),
      })),
    })
    
  } catch (error) {
    console.error('Error listing API keys:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to list API keys', undefined, 500)
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required', undefined, 401)
  }
  
  try {
    const body = await request.json()
    
    // Validate name
    if (!body.name || typeof body.name !== 'string') {
      return validationErrorResponse('Validation failed', { name: 'Name is required' })
    }
    
    // Validate scopes
    if (!body.scopes || !Array.isArray(body.scopes) || body.scopes.length === 0) {
      return validationErrorResponse('Validation failed', { scopes: 'At least one scope is required' })
    }
    
    const validScopes: ApiScope[] = [
      'clients:read', 'clients:write',
      'debts:read', 'debts:write',
      'reminders:read', 'reminders:write',
      'webhooks:manage', 'analytics:read',
    ]
    
    const invalidScopes = body.scopes.filter((s: string) => !validScopes.includes(s))
    if (invalidScopes.length > 0) {
      return validationErrorResponse('Validation failed', { 
        scopes: `Invalid scopes: ${invalidScopes.join(', ')}` 
      })
    }
    
    // Validate rate limit
    const rateLimit = parseInt(body.rateLimit) || 100
    if (rateLimit < 1 || rateLimit > 1000) {
      return validationErrorResponse('Validation failed', { 
        rateLimit: 'Rate limit must be between 1 and 1000' 
      })
    }
    
    // Parse expiration date
    let expiresAt: Date | undefined
    if (body.expiresAt) {
      expiresAt = new Date(body.expiresAt)
      if (isNaN(expiresAt.getTime())) {
        return validationErrorResponse('Validation failed', { 
          expiresAt: 'Invalid expiration date' 
        })
      }
      if (expiresAt <= new Date()) {
        return validationErrorResponse('Validation failed', { 
          expiresAt: 'Expiration date must be in the future' 
        })
      }
    }
    
    // Create API key
    const result = await createApiKey(
      session.user.id,
      body.name,
      body.scopes as ApiScope[],
      rateLimit,
      expiresAt
    )
    
    return createdResponse({
      id: result.id,
      key: result.key,
      keyPrefix: result.keyPrefix,
      name: body.name,
      scopes: body.scopes,
      rateLimit,
      expiresAt,
    })
    
  } catch (error) {
    console.error('Error creating API key:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to create API key', undefined, 500)
  }
}
