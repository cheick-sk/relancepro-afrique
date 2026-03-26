/**
 * Reminders API - List and Create/Send
 * GET /api/v1/reminders - List reminders
 * POST /api/v1/reminders - Create and send a reminder
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
import { sendEmail } from '@/lib/services/email'
import { sendWhatsApp } from '@/lib/services/whatsapp'

// Allowed filter params for reminders
const ALLOWED_FILTERS = ['status', 'type', 'clientId', 'debtId'] as const
type ReminderFilter = typeof ALLOWED_FILTERS[number]

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  // Authenticate and check scope
  const authResult = await requireScope(request, 'reminders:read' as ApiScope)
  
  if ('error' in authResult) {
    return authResult.error
  }
  
  const { apiKey } = authResult
  
  try {
    const { searchParams } = new URL(request.url)
    const { page, perPage, offset } = getPaginationParams(searchParams)
    const filters = getFilterParams<ReminderFilter>(searchParams, [...ALLOWED_FILTERS])
    
    // Build where clause
    const where: Record<string, unknown> = {
      profileId: apiKey.profileId,
    }
    
    if (filters.status) {
      where.status = filters.status
    }
    
    if (filters.type) {
      where.type = filters.type
    }
    
    if (filters.clientId) {
      where.clientId = filters.clientId
    }
    
    if (filters.debtId) {
      where.debtId = filters.debtId
    }
    
    // Get total count
    const total = await db.reminder.count({ where })
    
    // Get reminders
    const reminders = await db.reminder.findMany({
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
          },
        },
        debt: {
          select: {
            id: true,
            reference: true,
            amount: true,
            currency: true,
            status: true,
          },
        },
      },
    })
    
    // Format response
    const formattedReminders = reminders.map(reminder => ({
      id: reminder.id,
      type: reminder.type,
      subject: reminder.subject,
      message: reminder.message,
      tone: reminder.tone,
      status: reminder.status,
      error: reminder.error,
      sentAt: reminder.sentAt,
      deliveredAt: reminder.deliveredAt,
      openedAt: reminder.openedAt,
      responseReceived: reminder.responseReceived,
      respondedAt: reminder.respondedAt,
      client: reminder.client,
      debt: reminder.debt,
      createdAt: reminder.createdAt,
    }))
    
    // Log usage
    await logApiUsage(apiKey.id, request, 200, Date.now() - startTime)
    
    return paginatedResponse(formattedReminders, {
      page,
      perPage,
      total,
      baseUrl: '/api/v1/reminders',
    })
    
  } catch (error) {
    console.error('Error listing reminders:', error)
    await logApiUsage(apiKey.id, request, 500, Date.now() - startTime, 'Internal server error')
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to list reminders', undefined, 500)
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  // Authenticate and check scope
  const authResult = await requireScope(request, 'reminders:write' as ApiScope)
  
  if ('error' in authResult) {
    return authResult.error
  }
  
  const { apiKey } = authResult
  
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.debtId) {
      return validationErrorResponse('Validation failed', { debtId: 'Debt ID is required' })
    }
    
    if (!body.type || !['email', 'whatsapp'].includes(body.type)) {
      return validationErrorResponse('Validation failed', { type: 'Type must be "email" or "whatsapp"' })
    }
    
    // Get debt with client
    const debt = await db.debt.findFirst({
      where: {
        id: body.debtId,
        profileId: apiKey.profileId,
      },
      include: {
        client: true,
      },
    })
    
    if (!debt) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Debt not found',
        { debtId: body.debtId },
        404
      )
    }
    
    // Validate client has contact info
    if (body.type === 'email' && !debt.client.email) {
      return validationErrorResponse('Validation failed', { 
        email: 'Client does not have an email address' 
      })
    }
    
    if (body.type === 'whatsapp' && !debt.client.phone) {
      return validationErrorResponse('Validation failed', { 
        phone: 'Client does not have a phone number' 
      })
    }
    
    // Create reminder record
    const reminder = await db.reminder.create({
      data: {
        debtId: debt.id,
        clientId: debt.clientId,
        profileId: apiKey.profileId,
        type: body.type,
        subject: body.subject || `Rappel - Facture ${debt.reference || debt.id}`,
        message: body.message || '',
        tone: body.tone || 'formal',
        status: 'pending',
      },
    })
    
    let sendError: string | null = null
    let sentAt: Date | null = null
    
    try {
      // Send reminder
      if (body.type === 'email') {
        // Get user settings for email
        const settings = await db.settings.findUnique({
          where: { profileId: apiKey.profileId },
        })
        
        await sendEmail({
          to: debt.client.email!,
          subject: reminder.subject!,
          html: generateEmailHtml(reminder.message, debt, debt.client),
          profileId: apiKey.profileId,
        })
        
        sentAt = new Date()
      } else if (body.type === 'whatsapp') {
        await sendWhatsApp({
          to: debt.client.phone!,
          message: reminder.message || generateWhatsAppMessage(debt, debt.client),
          profileId: apiKey.profileId,
        })
        
        sentAt = new Date()
      }
      
      // Update reminder status
      await db.reminder.update({
        where: { id: reminder.id },
        data: {
          status: 'sent',
          sentAt,
        },
      })
      
      // Update debt reminder info
      await db.debt.update({
        where: { id: debt.id },
        data: {
          reminderCount: { increment: 1 },
          lastReminderAt: sentAt,
        },
      })
      
    } catch (err) {
      sendError = err instanceof Error ? err.message : 'Failed to send reminder'
      
      // Update reminder with error
      await db.reminder.update({
        where: { id: reminder.id },
        data: {
          status: 'failed',
          error: sendError,
        },
      })
    }
    
    // Get updated reminder
    const updatedReminder = await db.reminder.findUnique({
      where: { id: reminder.id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        debt: {
          select: {
            id: true,
            reference: true,
            amount: true,
            currency: true,
          },
        },
      },
    })
    
    // Log usage
    await logApiUsage(apiKey.id, request, sendError ? 500 : 201, Date.now() - startTime, sendError || undefined)
    
    if (sendError) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to send reminder',
        { error: sendError, reminderId: reminder.id },
        500
      )
    }
    
    return createdResponse({
      id: updatedReminder!.id,
      type: updatedReminder!.type,
      subject: updatedReminder!.subject,
      message: updatedReminder!.message,
      status: updatedReminder!.status,
      sentAt: updatedReminder!.sentAt,
      client: updatedReminder!.client,
      debt: updatedReminder!.debt,
      createdAt: updatedReminder!.createdAt,
    }, `/api/v1/reminders/${updatedReminder!.id}`)
    
  } catch (error) {
    console.error('Error creating reminder:', error)
    await logApiUsage(apiKey.id, request, 500, Date.now() - startTime, 'Internal server error')
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to create reminder', undefined, 500)
  }
}

// Helper functions for generating message content
function generateEmailHtml(message: string, debt: { id: string; reference: string | null; amount: number; currency: string }, client: { name: string }): string {
  const formattedAmount = new Intl.NumberFormat('fr-FR').format(debt.amount)
  
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Rappel de paiement</h2>
      <p>Cher(e) ${client.name},</p>
      ${message || `<p>Nous vous rappelons que vous avez une facture en attente de paiement.</p>`}
      <div style="background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
        <p><strong>Référence:</strong> ${debt.reference || debt.id}</p>
        <p><strong>Montant:</strong> ${formattedAmount} ${debt.currency}</p>
      </div>
      <p>Merci de régulariser votre situation dans les meilleurs délais.</p>
      <p>Cordialement,<br>L'équipe RelancePro Africa</p>
    </div>
  `
}

function generateWhatsAppMessage(debt: { id: string; reference: string | null; amount: number; currency: string }, client: { name: string }): string {
  const formattedAmount = new Intl.NumberFormat('fr-FR').format(debt.amount)
  
  return `Bonjour ${client.name},

Nous vous rappelons que vous avez une facture en attente:
- Référence: ${debt.reference || debt.id}
- Montant: ${formattedAmount} ${debt.currency}

Merci de régulariser votre situation.

Cordialement,
RelancePro Africa`
}
