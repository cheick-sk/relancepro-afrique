/**
 * API Key Usage Statistics
 * GET /api/api-keys/[id]/stats - Get usage statistics for an API key
 */

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { 
  successResponse, 
  notFoundResponse,
  errorResponse,
  ErrorCodes,
} from '@/lib/api/response'
import { getApiUsageStats } from '@/lib/api/rate-limiter'

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
    
    // Get usage stats
    const stats = await getApiUsageStats(id, 7)
    
    return successResponse({ stats })
    
  } catch (error) {
    console.error('Error getting API key stats:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to get API key statistics', undefined, 500)
  }
}
