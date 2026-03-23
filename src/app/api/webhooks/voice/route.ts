// =====================================================
// RELANCEPRO AFRICA - Voice Webhook Handler
// Handle voice call webhooks, IVR responses, and call status updates
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handleVoiceWebhook as handleTwilioVoiceWebhook, validateTwilioWebhook } from '@/lib/sms/twilio';
import { handleVoiceWebhook as handleATVoiceWebhook } from '@/lib/sms/africastalking';
import { IVR_MENUS, generateIVRTwiML } from '@/lib/voice/call-scripts';
import { logAudit } from '@/lib/audit';

// =====================================================
// POST: Handle Voice Webhooks
// =====================================================

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    const body = await request.text();
    
    // Determine provider
    const provider = request.headers.get('x-provider') || 
                    request.nextUrl.searchParams.get('provider') ||
                    detectProviderFromPayload(body);

    console.log(`[Voice Webhook] Received from ${provider}`);

    // Check if this is an IVR response
    const params = new URLSearchParams(body);
    const digits = params.get('Digits');
    
    if (digits) {
      return await handleIVRResponse(digits, body);
    }

    if (provider === 'twilio') {
      return await handleTwilioVoiceWebhookHandler(request, body);
    } else if (provider === 'africastalking') {
      return await handleATVoiceWebhookHandler(request, body);
    } else {
      return await handleAutoDetectedVoiceWebhook(body);
    }

  } catch (error) {
    console.error('[Voice Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// =====================================================
// Twilio Voice Webhook Handler
// =====================================================

async function handleTwilioVoiceWebhookHandler(
  request: NextRequest,
  rawBody: string
): Promise<NextResponse> {
  try {
    const params = new URLSearchParams(rawBody);
    const webhookData: Record<string, string> = {};
    params.forEach((value, key) => {
      webhookData[key] = value;
    });

    // Validate signature (optional in development)
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
        console.warn('[Voice Webhook] Invalid Twilio signature');
        return new NextResponse('<Response><Reject/></Response>', {
          status: 401,
          headers: { 'Content-Type': 'application/xml' },
        });
      }
    }

    // Check if this is a call status update
    const callSid = webhookData.CallSid || webhookData.CallUUID;
    const callStatus = webhookData.CallStatus;

    if (callSid && callStatus) {
      // Map to our webhook type
      const twilioWebhook = {
        CallSid: callSid,
        AccountSid: webhookData.AccountSid || '',
        From: webhookData.From || '',
        To: webhookData.To || '',
        CallStatus: callStatus,
        CallDuration: webhookData.CallDuration,
        RecordingUrl: webhookData.RecordingUrl,
        ErrorCode: webhookData.ErrorCode,
        ErrorMessage: webhookData.ErrorMessage,
        Price: webhookData.Price,
        PriceUnit: webhookData.PriceUnit,
      };

      // Process webhook
      const result = handleTwilioVoiceWebhook(twilioWebhook);

      // Update voice call in database
      const updatedCall = await db.voiceCall.updateMany({
        where: { callId: result.callId },
        data: {
          status: result.status,
          duration: result.duration,
          recordingUrl: result.recordingUrl,
          errorCode: result.errorCode,
          errorMessage: result.errorMessage,
          endedAt: ['completed', 'failed', 'busy', 'no-answer', 'canceled'].includes(result.status) 
            ? new Date() 
            : null,
          updatedAt: new Date(),
        },
      });

      // Log audit
      if (updatedCall.count > 0) {
        const voiceCall = await db.voiceCall.findFirst({
          where: { callId: result.callId },
        });

        if (voiceCall) {
          await logAudit({
            userId: voiceCall.profileId,
            action: 'voice_call_status_update',
            entityType: 'VoiceCall',
            entityId: voiceCall.id,
            details: JSON.stringify({
              callId: result.callId,
              status: result.status,
              duration: result.duration,
            }),
            status: result.status === 'completed' ? 'success' : 'info',
          });
        }
      }

      console.log(`[Voice Webhook] Twilio call update: ${result.callId} -> ${result.status}`);
    }

    // Return empty TwiML response
    return new NextResponse('<Response></Response>', {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });

  } catch (error) {
    console.error('[Voice Webhook] Twilio processing error:', error);
    return new NextResponse('<Response><Say>Une erreur est survenue.</Say></Response>', {
      status: 500,
      headers: { 'Content-Type': 'application/xml' },
    });
  }
}

// =====================================================
// Africa's Talking Voice Webhook Handler
// =====================================================

async function handleATVoiceWebhookHandler(
  request: NextRequest,
  rawBody: string
): Promise<NextResponse> {
  try {
    const payload = JSON.parse(rawBody);

    const webhookData = {
      callSessionId: payload.callSessionId || payload.sessionId,
      callerNumber: payload.callerNumber || payload.caller,
      destinationNumber: payload.destinationNumber || payload.called,
      callStartTime: payload.callStartTime || new Date().toISOString(),
      callDirection: payload.callDirection || 'outbound',
      status: payload.status || payload.callState || 'unknown',
      durationInSeconds: payload.durationInSeconds || payload.duration,
      recordingUrl: payload.recordingUrl,
      currencyCode: payload.currencyCode,
      amount: payload.amount,
    };

    // Process webhook
    const result = handleATVoiceWebhook(webhookData);

    // Update voice call in database
    await db.voiceCall.updateMany({
      where: { callId: result.callId },
      data: {
        status: result.status,
        duration: result.duration,
        recordingUrl: result.recordingUrl,
        endedAt: ['completed', 'failed', 'busy', 'no-answer', 'canceled'].includes(result.status) 
          ? new Date() 
          : null,
        updatedAt: new Date(),
      },
    });

    console.log(`[Voice Webhook] Africa's Talking call update: ${result.callId} -> ${result.status}`);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[Voice Webhook] Africa\'s Talking processing error:', error);
    return NextResponse.json(
      { error: 'Processing failed' },
      { status: 500 }
    );
  }
}

// =====================================================
// IVR Response Handler
// =====================================================

async function handleIVRResponse(
  digits: string,
  rawBody: string
): Promise<NextResponse> {
  try {
    const params = new URLSearchParams(rawBody);
    const callSid = params.get('CallSid') || params.get('CallUUID');
    const from = params.get('From') || params.get('callerNumber');
    const to = params.get('To') || params.get('destinationNumber');
    const menuId = params.get('menuId') || 'main_menu';

    console.log(`[Voice Webhook] IVR input: ${digits} from ${from}`);

    // Get menu options
    const menu = IVR_MENUS.find(m => m.id === menuId);
    const option = menu?.options.find(o => o.digit === digits);

    if (!option) {
      // Invalid input, replay menu
      const twiml = generateIVRTwiML(menuId);
      return new NextResponse(twiml, {
        status: 200,
        headers: { 'Content-Type': 'application/xml' },
      });
    }

    // Handle action
    let twiml: string;

    switch (option.action) {
      case 'repeat_message':
        // Get original message from database and replay
        twiml = `<Response>
          <Say language="fr-FR">Veuillez patienter pendant que nous récupérons votre message.</Say>
          <Redirect>/api/webhooks/voice/replay?callSid=${callSid}</Redirect>
        </Response>`;
        break;

      case 'transfer_agent':
        twiml = `<Response>
          <Say language="fr-FR">Veuillez patienter, nous vous transférons vers un conseiller.</Say>
          <Dial timeout="30">${process.env.SUPPORT_PHONE_NUMBER || '+224000000000'}</Dial>
          <Say language="fr-FR">Désolé, aucun conseiller n'est disponible. Veuillez rappeler ultérieurement.</Say>
        </Response>`;
        break;

      case 'payment_info':
        twiml = `<Response>
          <Say language="fr-FR">
            Pour effectuer un paiement, vous pouvez:
            Un, faire un virement bancaire vers le compte suivant: ${process.env.BANK_ACCOUNT || 'Non disponible'}.
            Deux, utiliser Mobile Money au numéro: ${process.env.MOBILE_MONEY_NUMBER || 'Non disponible'}.
            Trois, payer en ligne via notre portail client.
            Merci.
          </Say>
        </Response>`;
        break;

      case 'payment_plan':
        twiml = `<Response>
          <Say language="fr-FR">
            Pour demander un plan de paiement, veuillez contacter notre service client au ${process.env.SUPPORT_PHONE_NUMBER || 'votre numéro habituel'}.
            Nos conseillers sont disponibles du lundi au vendredi de 8 heures à 17 heures.
          </Say>
        </Response>`;
        break;

      case 'dispute':
        // Redirect to dispute menu
        twiml = generateIVRTwiML('dispute_menu');
        break;

      case 'record_message':
        twiml = `<Response>
          <Say language="fr-FR">Vous pouvez enregistrer votre message après le bip. Appuyez sur dièse pour terminer.</Say>
          <Record maxLength="120" finishOnKey="#" action="/api/webhooks/voice/recording" />
        </Response>`;
        break;

      case 'already_paid':
        twiml = `<Response>
          <Say language="fr-FR">
            Si vous avez déjà effectué un paiement, merci de nous envoyer la preuve de paiement par WhatsApp ou email.
            Nous traiterons votre demande dans les plus brefs délais.
          </Say>
        </Response>`;
        break;

      case 'back_main':
        twiml = generateIVRTwiML('main_menu');
        break;

      default:
        twiml = `<Response>
          <Say language="fr-FR">Option non reconnue. Au revoir.</Say>
        </Response>`;
    }

    // Log IVR interaction
    if (callSid) {
      await db.voiceCall.updateMany({
        where: { callId: callSid },
        data: {
          updatedAt: new Date(),
        },
      });
    }

    return new NextResponse(twiml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });

  } catch (error) {
    console.error('[Voice Webhook] IVR error:', error);
    return new NextResponse('<Response><Say>Une erreur est survenue. Au revoir.</Say></Response>', {
      status: 500,
      headers: { 'Content-Type': 'application/xml' },
    });
  }
}

// =====================================================
// Auto-detect Handler
// =====================================================

async function handleAutoDetectedVoiceWebhook(rawBody: string): Promise<NextResponse> {
  // Try JSON (Africa's Talking)
  try {
    const json = JSON.parse(rawBody);
    if (json.callSessionId || json.callerNumber) {
      return await handleATVoiceWebhookHandler(
        { headers: new Headers(), nextUrl: new URL('http://localhost'), text: async () => rawBody } as NextRequest,
        rawBody
      );
    }
  } catch {
    // Not JSON
  }

  // Try form data (Twilio)
  if (rawBody.includes('CallSid=') || rawBody.includes('CallStatus=')) {
    return await handleTwilioVoiceWebhookHandler(
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
  if (body.includes('CallSid=') || body.includes('AccountSid=')) {
    return 'twilio';
  }
  
  try {
    const json = JSON.parse(body);
    if (json.callSessionId || json.callerNumber) {
      return 'africastalking';
    }
  } catch {
    // Not JSON
  }
  
  return 'unknown';
}

// =====================================================
// GET: Webhook verification
// =====================================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get('hub.challenge');
  
  if (challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  
  return NextResponse.json({
    status: 'ok',
    message: 'Voice Webhook endpoint is active',
    timestamp: new Date().toISOString(),
  });
}
