/**
 * API Key Detail - Get, Update, Delete
 * GET /api/api-keys/[id] - Get API key details
 * PATCH /api/api-keys/[id] - Update API key (toggle active, update scopes)
 * DELETE /api/api-keys/[id] - Delete API key
 */

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { 
  successResponse, 
  noContentResponse,
  notFoundResponse,
  errorResponse,
  validationErrorResponse,
  ErrorCodes,
} from '@/lib/api/response'
import { deleteApiKey, updateApiKeyScopes, type ApiScope } from '@/lib/api/auth'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required', undefined, 401)
  }
  
  const { id } = await params
  
  try {
    const key = await db.apiKey.findFirst({
      where: { 
        id,
        profileId: session.user.id,
      },
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
        updatedAt: true,
      },
    })
    
    if (!key) {
      return notFoundResponse('API Key', id)
    }
    
    return successResponse({
      ...key,
      scopes: JSON.parse(key.scopes),
    })
    
  } catch (error) {
    console.error('Error getting API key:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to get API key', undefined, 500)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required', undefined, 401)
  }
  
  const { id } = await params
  
  try {
    // Check if key exists and belongs to user
    const existingKey = await db.apiKey.findFirst({
      where: { 
        id,
        profileId: session.user.id,
      },
    })
    
    if (!existingKey) {
      return notFoundResponse('API Key', id)
    }
    
    const body = await request.json()
    
    // Update active status
    if (body.active !== undefined) {
      await db.apiKey.update({
        where: { id },
        data: { active: body.active },
      })
    }
    
    // Update scopes if provided
    if (body.scopes && Array.isArray(body.scopes)) {
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
      
      await updateApiKeyScopes(id, session.user.id, body.scopes as ApiScope[])
    }
    
    // Get updated key
    const updatedKey = await db.apiKey.findUnique({
      where: { id },
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
    })
    
    return successResponse({
      ...updatedKey,
      scopes: JSON.parse(updatedKey!.scopes),
    })
    
  } catch (error) {
    console.error('Error updating API key:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to update API key', undefined, 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required', undefined, 401)
  }
  
  const { id } = await params
  
  try {
    const deleted = await deleteApiKey(id, session.user.id)
    
    if (!deleted) {
      return notFoundResponse('API Key', id)
    }
    
    return noContentResponse()
    
  } catch (error) {
    console.error('Error deleting API key:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to delete API key', undefined, 500)
  }
}
