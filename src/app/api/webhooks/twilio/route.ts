// =====================================================
// RELANCEPRO AFRICA - Twilio Webhook Handler
// Handle SMS delivery status and voice call status callbacks
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handleDeliveryStatus, handleVoiceCallStatus, validateTwilioWebhook } from '@/lib/sms/twilio-service';
import { TwilioSMSWebhook, TwilioVoiceWebhook } from '@/lib/sms/types';

// =====================================================
// POST: Handle Twilio Webhooks
// =====================================================

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature validation
    const rawBody = await request.text();
    const formData = new URLSearchParams(rawBody);
    
    // Convert to object
    const webhookData: Record<string, string> = {};
    formData.forEach((value, key) => {
      webhookData[key] = value;
    });

    // Validate webhook signature (in production)
    const signature = request.headers.get('x-twilio-signature') || '';
    const url = request.url;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (process.env.NODE_ENV === 'production' && authToken) {
      const isValid = validateTwilioWebhook(signature, url, webhookData, authToken);
      if (!isValid) {
        console.error('[Twilio Webhook] Invalid signature');
        return new NextResponse('Invalid signature', { status: 403 });
      }
    }

    // Determine webhook type based on data
    const isVoiceCall = webhookData.CallSid || webhookData.CallStatus;
    const isSMS = webhookData.MessageSid || webhookData.MessageStatus;

    if (isVoiceCall) {
      // Handle voice call status
      return await handleVoiceWebhook(webhookData as unknown as TwilioVoiceWebhook);
    } else if (isSMS) {
      // Handle SMS delivery status
      return await handleSMSWebhook(webhookData as unknown as TwilioSMSWebhook);
    } else {
      console.error('[Twilio Webhook] Unknown webhook type');
      return new NextResponse('Unknown webhook type', { status: 400 });
    }
  } catch (error) {
    console.error('[Twilio Webhook] Error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}

// =====================================================
// SMS Delivery Status Handler
// =====================================================

async function handleSMSWebhook(webhook: TwilioSMSWebhook) {
  try {
    const statusData = handleDeliveryStatus(webhook);

    // Find SMS log by message ID
    const smsLog = await db.smsLog.findFirst({
      where: { messageId: webhook.MessageSid },
    });

    if (!smsLog) {
      console.warn('[Twilio Webhook] SMS log not found for message:', webhook.MessageSid);
      return new NextResponse('OK', { status: 200 });
    }

    // Update SMS log
    await db.smsLog.update({
      where: { id: smsLog.id },
      data: {
        status: statusData.status,
        errorCode: statusData.errorCode,
        errorMessage: statusData.errorMessage,
        cost: statusData.cost || smsLog.cost,
        deliveredAt: statusData.status === 'delivered' ? new Date() : smsLog.deliveredAt,
      },
    });

    // If linked to a reminder, update reminder status
    if (smsLog.reminderId) {
      await updateReminderStatus(smsLog.reminderId, statusData.status);
    }

    console.log(`[Twilio Webhook] SMS ${webhook.MessageSid} status: ${statusData.status}`);
    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('[Twilio Webhook] SMS handler error:', error);
    throw error;
  }
}

// =====================================================
// Voice Call Status Handler
// =====================================================

async function handleVoiceWebhook(webhook: TwilioVoiceWebhook) {
  try {
    const statusData = handleVoiceCallStatus(webhook);

    // Find voice call by call ID
    const voiceCall = await db.voiceCall.findFirst({
      where: { callId: webhook.CallSid },
    });

    if (!voiceCall) {
      console.warn('[Twilio Webhook] Voice call not found for call:', webhook.CallSid);
      return new NextResponse('OK', { status: 200 });
    }

    // Update voice call log
    await db.voiceCall.update({
      where: { id: voiceCall.id },
      data: {
        status: statusData.status,
        duration: statusData.duration || voiceCall.duration,
        recordingUrl: statusData.recordingUrl || voiceCall.recordingUrl,
        errorCode: statusData.errorCode,
        errorMessage: statusData.errorMessage,
        cost: statusData.cost || voiceCall.cost,
        endedAt: ['completed', 'failed', 'busy', 'no-answer'].includes(statusData.status) 
          ? new Date() 
          : voiceCall.endedAt,
      },
    });

    // If linked to a reminder, update reminder status
    if (voiceCall.reminderId) {
      await updateReminderStatus(
        voiceCall.reminderId, 
        statusData.status === 'completed' ? 'delivered' : 'failed'
      );
    }

    console.log(`[Twilio Webhook] Call ${webhook.CallSid} status: ${statusData.status}`);
    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('[Twilio Webhook] Voice handler error:', error);
    throw error;
  }
}

// =====================================================
// Helper: Update Reminder Status
// =====================================================

async function updateReminderStatus(reminderId: string, status: string) {
  try {
    const updateData: Record<string, unknown> = {
      status: status === 'delivered' ? 'delivered' : status === 'sent' ? 'sent' : 'failed',
    };

    if (status === 'delivered') {
      updateData.deliveredAt = new Date();
    }

    await db.reminder.update({
      where: { id: reminderId },
      data: updateData,
    });
  } catch (error) {
    console.error('[Twilio Webhook] Error updating reminder:', error);
  }
}

// =====================================================
// GET: Health Check
// =====================================================

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Twilio webhook endpoint is active',
    timestamp: new Date().toISOString(),
  });
}
