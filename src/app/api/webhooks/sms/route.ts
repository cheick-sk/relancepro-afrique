// =====================================================
// RELANCEPRO AFRICA - SMS Webhook Handler
// Handle delivery status webhooks from Twilio and Africa's Talking
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handleWebhook as handleTwilioWebhook, validateTwilioWebhook } from '@/lib/sms/twilio';
import { handleWebhook as handleATWebhook } from '@/lib/sms/africastalking';
import { logAudit } from '@/lib/audit';

// =====================================================
// POST: Handle SMS Delivery Webhooks
// =====================================================

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    const body = await request.text();
    
    // Determine provider based on headers or URL params
    const provider = request.headers.get('x-provider') || 
                    request.nextUrl.searchParams.get('provider') ||
                    detectProviderFromPayload(body);

    console.log(`[SMS Webhook] Received from ${provider}`);

    if (provider === 'twilio') {
      return await handleTwilioDeliveryWebhook(request, body);
    } else if (provider === 'africastalking') {
      return await handleATDeliveryWebhook(request, body);
    } else {
      // Try to auto-detect and process
      return await handleAutoDetectedWebhook(body);
    }

  } catch (error) {
    console.error('[SMS Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// =====================================================
// Twilio Webhook Handler
// =====================================================

async function handleTwilioDeliveryWebhook(
  request: NextRequest,
  rawBody: string
): Promise<NextResponse> {
  try {
    // Parse form data
    const params = new URLSearchParams(rawBody);
    const webhookData: Record<string, string> = {};
    params.forEach((value, key) => {
      webhookData[key] = value;
    });

    // Validate webhook signature (optional in development)
    const signature = request.headers.get('x-twilio-signature') || '';
    const authToken = process.env.TWILIO_AUTH_TOKEN || '';
    
    if (authToken && signature) {
      const isValid = validateTwilioWebhook(
        signature,
        request.url,
        webhookData,
        authToken
      );
      
      if (!isValid) {
        console.warn('[SMS Webhook] Invalid Twilio signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }

    // Map to our webhook type
    const twilioWebhook = {
      MessageSid: webhookData.MessageSid || webhookData.SmsSid,
      AccountSid: webhookData.AccountSid || '',
      From: webhookData.From || '',
      To: webhookData.To || '',
      MessageStatus: webhookData.MessageStatus || webhookData.SmsStatus || 'unknown',
      ErrorCode: webhookData.ErrorCode,
      ErrorMessage: webhookData.ErrorMessage,
      NumSegments: webhookData.NumSegments,
      Price: webhookData.Price,
      PriceUnit: webhookData.PriceUnit,
    };

    // Process webhook
    const result = handleTwilioWebhook(twilioWebhook);

    // Update SMS log in database
    const updatedLog = await db.smsLog.updateMany({
      where: { messageId: result.messageId },
      data: {
        status: result.status,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
        deliveredAt: result.status === 'delivered' ? new Date() : null,
        cost: result.cost,
        updatedAt: new Date(),
      },
    });

    // Log audit if log was found
    if (updatedLog.count > 0) {
      const smsLog = await db.smsLog.findFirst({
        where: { messageId: result.messageId },
      });

      if (smsLog) {
        await logAudit({
          userId: smsLog.profileId,
          action: 'sms_delivery_update',
          entityType: 'SmsLog',
          entityId: smsLog.id,
          details: JSON.stringify({
            messageId: result.messageId,
            status: result.status,
            to: result.to,
            errorCode: result.errorCode,
          }),
          status: result.status === 'delivered' ? 'success' : 'info',
        });
      }
    }

    console.log(`[SMS Webhook] Twilio delivery update: ${result.messageId} -> ${result.status}`);

    // Return TwiML response
    return new NextResponse('<Response></Response>', {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });

  } catch (error) {
    console.error('[SMS Webhook] Twilio processing error:', error);
    return NextResponse.json(
      { error: 'Processing failed' },
      { status: 500 }
    );
  }
}

// =====================================================
// Africa's Talking Webhook Handler
// =====================================================

async function handleATDeliveryWebhook(
  request: NextRequest,
  rawBody: string
): Promise<NextResponse> {
  try {
    // Parse JSON payload
    const payload = JSON.parse(rawBody);

    // Africa's Talking sends delivery reports
    const webhookData = {
      id: payload.id || payload.messageId,
      phoneNumber: payload.phoneNumber || payload.recipient,
      statusCode: payload.statusCode || 0,
      status: payload.status || 'unknown',
      cost: payload.cost || '0',
    };

    // Process webhook
    const result = handleATWebhook(webhookData);

    // Update SMS log in database
    const updatedLog = await db.smsLog.updateMany({
      where: { messageId: result.messageId },
      data: {
        status: result.status,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
        deliveredAt: result.status === 'delivered' ? new Date() : null,
        cost: result.cost,
        updatedAt: new Date(),
      },
    });

    // Log audit if log was found
    if (updatedLog.count > 0) {
      const smsLog = await db.smsLog.findFirst({
        where: { messageId: result.messageId },
      });

      if (smsLog) {
        await logAudit({
          userId: smsLog.profileId,
          action: 'sms_delivery_update',
          entityType: 'SmsLog',
          entityId: smsLog.id,
          details: JSON.stringify({
            messageId: result.messageId,
            status: result.status,
            to: result.to,
          }),
          status: result.status === 'delivered' ? 'success' : 'info',
        });
      }
    }

    console.log(`[SMS Webhook] Africa's Talking delivery update: ${result.messageId} -> ${result.status}`);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[SMS Webhook] Africa\'s Talking processing error:', error);
    return NextResponse.json(
      { error: 'Processing failed' },
      { status: 500 }
    );
  }
}

// =====================================================
// Auto-detect Handler
// =====================================================

async function handleAutoDetectedWebhook(rawBody: string): Promise<NextResponse> {
  // Try to parse as JSON first (Africa's Talking)
  try {
    const json = JSON.parse(rawBody);
    if (json.id || json.messageId || json.phoneNumber) {
      return await handleATDeliveryWebhook(
        { headers: new Headers(), nextUrl: new URL('http://localhost'), text: async () => rawBody } as NextRequest,
        rawBody
      );
    }
  } catch {
    // Not JSON, try Twilio format
  }

  // Try as form data (Twilio)
  if (rawBody.includes('MessageSid=') || rawBody.includes('SmsSid=')) {
    return await handleTwilioDeliveryWebhook(
      { headers: new Headers(), nextUrl: new URL('http://localhost'), text: async () => rawBody } as NextRequest,
      rawBody
    );
  }

  return NextResponse.json(
    { error: 'Unknown webhook format' },
    { status: 400 }
  );
}

// =====================================================
// Helper Functions
// =====================================================

function detectProviderFromPayload(body: string): string {
  // Check for Twilio signature
  if (body.includes('MessageSid=') || body.includes('AccountSid=')) {
    return 'twilio';
  }
  
  // Check for Africa's Talking format
  try {
    const json = JSON.parse(body);
    if (json.phoneNumber || json.statusCode !== undefined) {
      return 'africastalking';
    }
  } catch {
    // Not JSON
  }
  
  return 'unknown';
}

// =====================================================
// GET: Webhook verification (for some providers)
// =====================================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get('hub.challenge');
  
  if (challenge) {
    // Return challenge for webhook verification
    return new NextResponse(challenge, { status: 200 });
  }
  
  return NextResponse.json({
    status: 'ok',
    message: 'SMS Webhook endpoint is active',
    timestamp: new Date().toISOString(),
  });
}
