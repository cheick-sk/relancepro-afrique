// =====================================================
// RELANCEPRO AFRICA - Africa's Talking Webhook Handler
// Handle SMS delivery reports and voice call status callbacks
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handleDeliveryReport, handleVoiceCallStatus } from '@/lib/sms/africastalking-service';
import { AfricasTalkingSMSWebhook, AfricasTalkingVoiceWebhook } from '@/lib/sms/types';

// =====================================================
// POST: Handle Africa's Talking Webhooks
// =====================================================

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate API key (if configured)
    const apiKey = request.headers.get('apikey') || request.headers.get('ApiKey');
    if (process.env.AFRICASTALKING_API_KEY && apiKey !== process.env.AFRICASTALKING_API_KEY) {
      console.error("[Africa's Talking Webhook] Invalid API key");
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Determine webhook type
    const isVoiceCall = body.callSessionId || body.callStartTime;
    const isSMS = body.id || body.phoneNumber || body.status;

    if (isVoiceCall) {
      // Handle voice call status
      return await handleVoiceWebhook(body as AfricasTalkingVoiceWebhook);
    } else if (isSMS) {
      // Handle SMS delivery report (can be array or single object)
      return await handleSMSWebhook(body);
    } else {
      console.error("[Africa's Talking Webhook] Unknown webhook type");
      return new NextResponse('Unknown webhook type', { status: 400 });
    }
  } catch (error) {
    console.error("[Africa's Talking Webhook] Error:", error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}

// =====================================================
// SMS Delivery Report Handler
// =====================================================

async function handleSMSWebhook(webhook: AfricasTalkingSMSWebhook | AfricasTalkingSMSWebhook[]) {
  try {
    // Handle both single and batch webhooks
    const webhooks = Array.isArray(webhook) ? webhook : [webhook];
    
    for (const report of webhooks) {
      const statusData = handleDeliveryReport(report);

      // Find SMS log by message ID
      const smsLog = await db.smsLog.findFirst({
        where: { messageId: report.id },
      });

      if (!smsLog) {
        console.warn("[Africa's Talking Webhook] SMS log not found for message:", report.id);
        continue;
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

      console.log(`[Africa's Talking Webhook] SMS ${report.id} status: ${statusData.status}`);
    }

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error("[Africa's Talking Webhook] SMS handler error:", error);
    throw error;
  }
}

// =====================================================
// Voice Call Status Handler
// =====================================================

async function handleVoiceWebhook(webhook: AfricasTalkingVoiceWebhook) {
  try {
    const statusData = handleVoiceCallStatus(webhook);

    // Find voice call by call session ID
    const voiceCall = await db.voiceCall.findFirst({
      where: { callId: webhook.callSessionId },
    });

    if (!voiceCall) {
      console.warn("[Africa's Talking Webhook] Voice call not found for session:", webhook.callSessionId);
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

    console.log(`[Africa's Talking Webhook] Call ${webhook.callSessionId} status: ${statusData.status}`);
    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error("[Africa's Talking Webhook] Voice handler error:", error);
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
    console.error("[Africa's Talking Webhook] Error updating reminder:", error);
  }
}

// =====================================================
// GET: Health Check
// =====================================================

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: "Africa's Talking webhook endpoint is active",
    timestamp: new Date().toISOString(),
  });
}
