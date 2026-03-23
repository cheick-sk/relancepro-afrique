/**
 * Webhooks API - List, Create, Delete
 * GET /api/v1/webhooks - List registered webhooks
 * POST /api/v1/webhooks - Register new webhook
 * DELETE /api/v1/webhooks - Remove webhook
 */

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { 
  successResponse, 
  paginatedResponse, 
  createdResponse,
  noContentResponse,
  notFoundResponse,
  errorResponse,
  validationErrorResponse,
  ErrorCodes,
  getPaginationParams,
} from '@/lib/api/response'
import { 
  requireScope, 
  logApiUsage,
  type ApiScope 
} from '@/lib/api/auth'
import crypto from 'crypto'

// Supported webhook events
export const WEBHOOK_EVENTS = [
  'client.created',
  'client.updated',
  'client.deleted',
  'debt.created',
  'debt.updated',
  'debt.paid',
  'debt.deleted',
  'reminder.sent',
  'reminder.delivered',
  'reminder.failed',
  'payment.received',
] as const

type WebhookEvent = typeof WEBHOOK_EVENTS[number]

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  // Authenticate and check scope
  const authResult = await requireScope(request, 'webhooks:manage' as ApiScope)
  
  if ('error' in authResult) {
    return authResult.error
  }
  
  const { apiKey } = authResult
  
  try {
    const { searchParams } = new URL(request.url)
    const { page, perPage, offset } = getPaginationParams(searchParams)
    
    // Get total count
    const total = await db.webhook.count({
      where: { profileId: apiKey.profileId },
    })
    
    // Get webhooks
    const webhooks = await db.webhook.findMany({
      where: { profileId: apiKey.profileId },
      skip: offset,
      take: perPage,
      orderBy: { createdAt: 'desc' },
    })
    
    // Format response
    const formattedWebhooks = webhooks.map(webhook => ({
      id: webhook.id,
      name: webhook.name,
      url: webhook.url,
      events: JSON.parse(webhook.events),
      active: webhook.active,
      lastTriggeredAt: webhook.lastTriggeredAt,
      successCount: webhook.successCount,
      failureCount: webhook.failureCount,
      createdAt: webhook.createdAt,
      updatedAt: webhook.updatedAt,
    }))
    
    // Log usage
    await logApiUsage(apiKey.id, request, 200, Date.now() - startTime)
    
    return paginatedResponse(formattedWebhooks, {
      page,
      perPage,
      total,
      baseUrl: '/api/v1/webhooks',
    })
    
  } catch (error) {
    console.error('Error listing webhooks:', error)
    await logApiUsage(apiKey.id, request, 500, Date.now() - startTime, 'Internal server error')
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to list webhooks', undefined, 500)
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  // Authenticate and check scope
  const authResult = await requireScope(request, 'webhooks:manage' as ApiScope)
  
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
    
    if (!body.url) {
      return validationErrorResponse('Validation failed', { url: 'URL is required' })
    }
    
    // Validate URL format
    try {
      const url = new URL(body.url)
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Invalid protocol')
      }
    } catch {
      return validationErrorResponse('Validation failed', { url: 'Invalid URL format' })
    }
    
    // Validate events
    if (!body.events || !Array.isArray(body.events) || body.events.length === 0) {
      return validationErrorResponse('Validation failed', { events: 'At least one event is required' })
    }
    
    const invalidEvents = body.events.filter((e: string) => !WEBHOOK_EVENTS.includes(e as WebhookEvent))
    if (invalidEvents.length > 0) {
      return validationErrorResponse('Validation failed', { 
        events: `Invalid events: ${invalidEvents.join(', ')}. Valid events: ${WEBHOOK_EVENTS.join(', ')}` 
      })
    }
    
    // Generate secret for webhook signature
    const secret = crypto.randomBytes(32).toString('hex')
    
    // Create webhook
    const webhook = await db.webhook.create({
      data: {
        profileId: apiKey.profileId,
        name: body.name,
        url: body.url,
        secret,
        events: JSON.stringify(body.events),
        active: body.active !== false,
      },
    })
    
    // Log usage
    await logApiUsage(apiKey.id, request, 201, Date.now() - startTime)
    
    return createdResponse({
      id: webhook.id,
      name: webhook.name,
      url: webhook.url,
      secret: webhook.secret, // Only shown once on creation
      events: JSON.parse(webhook.events),
      active: webhook.active,
      createdAt: webhook.createdAt,
    }, `/api/v1/webhooks/${webhook.id}`)
    
  } catch (error) {
    console.error('Error creating webhook:', error)
    await logApiUsage(apiKey.id, request, 500, Date.now() - startTime, 'Internal server error')
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to create webhook', undefined, 500)
  }
}

export async function DELETE(request: NextRequest) {
  const startTime = Date.now()
  
  // Authenticate and check scope
  const authResult = await requireScope(request, 'webhooks:manage' as ApiScope)
  
  if ('error' in authResult) {
    return authResult.error
  }
  
  const { apiKey } = authResult
  
  try {
    const { searchParams } = new URL(request.url)
    const webhookId = searchParams.get('id')
    
    if (!webhookId) {
      return validationErrorResponse('Validation failed', { id: 'Webhook ID is required' })
    }
    
    // Check if webhook exists and belongs to user
    const existingWebhook = await db.webhook.findFirst({
      where: {
        id: webhookId,
        profileId: apiKey.profileId,
      },
    })
    
    if (!existingWebhook) {
      await logApiUsage(apiKey.id, request, 404, Date.now() - startTime)
      return notFoundResponse('Webhook', webhookId)
    }
    
    // Delete webhook
    await db.webhook.delete({
      where: { id: webhookId },
    })
    
    // Log usage
    await logApiUsage(apiKey.id, request, 204, Date.now() - startTime)
    
    return noContentResponse()
    
  } catch (error) {
    console.error('Error deleting webhook:', error)
    await logApiUsage(apiKey.id, request, 500, Date.now() - startTime, 'Internal server error')
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to delete webhook', undefined, 500)
  }
}

// Helper function to trigger webhooks (used by other services)
export async function triggerWebhooks(
  profileId: string,
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<void> {
  const webhooks = await db.webhook.findMany({
    where: {
      profileId,
      active: true,
    },
  })
  
  for (const webhook of webhooks) {
    const events = JSON.parse(webhook.events) as string[]
    
    if (!events.includes(event)) continue
    
    try {
      const payload = JSON.stringify({
        event,
        data,
        timestamp: new Date().toISOString(),
      })
      
      // Generate signature
      const signature = crypto
        .createHmac('sha256', webhook.secret || '')
        .update(payload)
        .digest('hex')
      
      // Send webhook
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-RelancePro-Signature': signature,
          'X-RelancePro-Event': event,
        },
        body: payload,
      })
      
      // Update stats
      await db.webhook.update({
        where: { id: webhook.id },
        data: {
          lastTriggeredAt: new Date(),
          successCount: response.ok ? { increment: 1 } : undefined,
          failureCount: response.ok ? undefined : { increment: 1 },
        },
      })
      
    } catch (error) {
      console.error(`Failed to trigger webhook ${webhook.id}:`, error)
      
      await db.webhook.update({
        where: { id: webhook.id },
        data: {
          lastTriggeredAt: new Date(),
          failureCount: { increment: 1 },
        },
      })
    }
  }
}
