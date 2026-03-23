// =====================================================
// RELANCEPRO AFRICA - Twilio SMS & Voice Service
// Integration with Twilio for SMS and Voice calls
// =====================================================

import { createHmac } from 'crypto';
import {
  SMSMessageResult,
  VoiceCallResult,
  SMSStatus,
  VoiceCallStatus,
  VoiceLanguage,
  ProviderBalance,
  TwilioSMSWebhook,
  TwilioVoiceWebhook,
  SMSError,
  VoiceCallError,
} from './types';

// =====================================================
// TWILIO CONFIGURATION
// =====================================================

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
}

function getTwilioConfig(): TwilioConfig | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !phoneNumber) {
    return null;
  }

  return { accountSid, authToken, phoneNumber };
}

// =====================================================
// PHONE NUMBER FORMATTING
// =====================================================

/**
 * Format phone number for Twilio (E.164 format)
 */
export function formatPhoneNumberForTwilio(phone: string): string {
  // Remove spaces, dashes, parentheses
  let formatted = phone.replace(/[\s\-\(\)]/g, '');

  // If starts with 00, replace with +
  if (formatted.startsWith('00')) {
    formatted = '+' + formatted.substring(2);
  }

  // If doesn't start with +, add +
  if (!formatted.startsWith('+')) {
    formatted = '+' + formatted;
  }

  return formatted;
}

/**
 * Detect country from phone number
 */
export function detectCountryFromPhone(phone: string): string {
  const formatted = formatPhoneNumberForTwilio(phone);
  
  if (formatted.startsWith('+224')) return 'GN'; // Guinea
  if (formatted.startsWith('+221')) return 'SN'; // Senegal
  if (formatted.startsWith('+225')) return 'CI'; // Ivory Coast
  if (formatted.startsWith('+223')) return 'ML'; // Mali
  if (formatted.startsWith('+226')) return 'BF'; // Burkina Faso
  if (formatted.startsWith('+233')) return 'GH'; // Ghana
  if (formatted.startsWith('+234')) return 'NG'; // Nigeria
  
  return 'UNKNOWN';
}

// =====================================================
// SMS SERVICE
// =====================================================

/**
 * Send SMS via Twilio
 */
export async function sendSMS(
  to: string,
  message: string
): Promise<SMSMessageResult> {
  const config = getTwilioConfig();

  if (!config) {
    // Development mode - simulate sending
    console.log('[Twilio] API not configured, simulating SMS send...');
    return {
      success: true,
      messageId: `simulated_twilio_${Date.now()}`,
      status: 'queued',
      provider: 'twilio',
      to: formatPhoneNumberForTwilio(to),
      cost: 0,
      segments: Math.ceil(message.length / 160),
    };
  }

  const formattedTo = formatPhoneNumberForTwilio(to);

  try {
    // Create Twilio API URL
    const url = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`;

    // Create form data
    const formData = new URLSearchParams();
    formData.append('To', formattedTo);
    formData.append('From', config.phoneNumber);
    formData.append('Body', message);

    // Create auth header (Base64 encoding of accountSid:authToken)
    const auth = Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Twilio] SMS error:', data);
      return {
        success: false,
        status: 'failed',
        provider: 'twilio',
        to: formattedTo,
        error: data.message || `Twilio error: ${response.status}`,
      };
    }

    return {
      success: true,
      messageId: data.sid,
      status: mapTwilioStatus(data.status),
      provider: 'twilio',
      to: formattedTo,
      cost: parseFloat(data.price || '0'),
      segments: parseInt(data.num_segments || '1'),
    };
  } catch (error) {
    console.error('[Twilio] SMS send error:', error);
    return {
      success: false,
      status: 'failed',
      provider: 'twilio',
      to: formattedTo,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Map Twilio status to our status
 */
function mapTwilioStatus(status: string): SMSStatus {
  const statusMap: Record<string, SMSStatus> = {
    'queued': 'queued',
    'sent': 'sent',
    'delivered': 'delivered',
    'undelivered': 'undelivered',
    'failed': 'failed',
    'accepted': 'accepted',
    'rejected': 'rejected',
  };
  return statusMap[status.toLowerCase()] || 'pending';
}

// =====================================================
// VOICE SERVICE
// =====================================================

/**
 * Language mapping for Twilio
 */
const TWILIO_VOICE_LANGUAGES: Record<VoiceLanguage, { language: string; voice: string }> = {
  'fr-FR': { language: 'fr-FR', voice: 'alice' },
  'fr-SN': { language: 'fr-FR', voice: 'alice' },
  'en-US': { language: 'en-US', voice: 'alice' },
  'en-GH': { language: 'en-US', voice: 'alice' },
  'en-NG': { language: 'en-US', voice: 'alice' },
};

/**
 * Send Voice Call via Twilio (Text-to-Speech)
 */
export async function sendVoiceCall(
  to: string,
  message: string,
  language: VoiceLanguage = 'fr-FR',
  callbackUrl?: string
): Promise<VoiceCallResult> {
  const config = getTwilioConfig();

  if (!config) {
    // Development mode - simulate calling
    console.log('[Twilio] API not configured, simulating voice call...');
    return {
      success: true,
      callId: `simulated_twilio_call_${Date.now()}`,
      status: 'queued',
      provider: 'twilio',
      to: formatPhoneNumberForTwilio(to),
    };
  }

  const formattedTo = formatPhoneNumberForTwilio(to);
  const voiceConfig = TWILIO_VOICE_LANGUAGES[language] || TWILIO_VOICE_LANGUAGES['fr-FR'];

  try {
    // Create TwiML for text-to-speech
    const twiml = `
      <Response>
        <Say language="${voiceConfig.language}" voice="${voiceConfig.voice}">
          ${escapeXml(message)}
        </Say>
      </Response>
    `;

    // Create Twilio API URL
    const url = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Calls.json`;

    // Create form data
    const formData = new URLSearchParams();
    formData.append('To', formattedTo);
    formData.append('From', config.phoneNumber);
    formData.append('Twiml', twiml);
    
    if (callbackUrl) {
      formData.append('StatusCallback', callbackUrl);
      formData.append('StatusCallbackEvent', 'initiated,ringing,answered,completed,failed,busy,no-answer');
    }

    // Create auth header
    const auth = Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Twilio] Voice call error:', data);
      return {
        success: false,
        status: 'failed',
        provider: 'twilio',
        to: formattedTo,
        error: data.message || `Twilio error: ${response.status}`,
      };
    }

    return {
      success: true,
      callId: data.sid,
      status: mapTwilioVoiceStatus(data.status),
      provider: 'twilio',
      to: formattedTo,
    };
  } catch (error) {
    console.error('[Twilio] Voice call error:', error);
    return {
      success: false,
      status: 'failed',
      provider: 'twilio',
      to: formattedTo,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send Voice Call with pre-recorded audio
 */
export async function sendVoiceCallWithAudio(
  to: string,
  audioUrl: string,
  callbackUrl?: string
): Promise<VoiceCallResult> {
  const config = getTwilioConfig();

  if (!config) {
    console.log('[Twilio] API not configured, simulating voice call with audio...');
    return {
      success: true,
      callId: `simulated_twilio_call_${Date.now()}`,
      status: 'queued',
      provider: 'twilio',
      to: formatPhoneNumberForTwilio(to),
    };
  }

  const formattedTo = formatPhoneNumberForTwilio(to);

  try {
    // Create TwiML for audio playback
    const twiml = `
      <Response>
        <Play loop="1">${escapeXml(audioUrl)}</Play>
      </Response>
    `;

    // Create Twilio API URL
    const url = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Calls.json`;

    // Create form data
    const formData = new URLSearchParams();
    formData.append('To', formattedTo);
    formData.append('From', config.phoneNumber);
    formData.append('Twiml', twiml);
    
    if (callbackUrl) {
      formData.append('StatusCallback', callbackUrl);
      formData.append('StatusCallbackEvent', 'initiated,ringing,answered,completed,failed,busy,no-answer');
    }

    const auth = Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Twilio] Voice call error:', data);
      return {
        success: false,
        status: 'failed',
        provider: 'twilio',
        to: formattedTo,
        error: data.message || `Twilio error: ${response.status}`,
      };
    }

    return {
      success: true,
      callId: data.sid,
      status: mapTwilioVoiceStatus(data.status),
      provider: 'twilio',
      to: formattedTo,
    };
  } catch (error) {
    console.error('[Twilio] Voice call error:', error);
    return {
      success: false,
      status: 'failed',
      provider: 'twilio',
      to: formattedTo,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Map Twilio voice status to our status
 */
function mapTwilioVoiceStatus(status: string): VoiceCallStatus {
  const statusMap: Record<string, VoiceCallStatus> = {
    'queued': 'queued',
    'ringing': 'ringing',
    'in-progress': 'in-progress',
    'completed': 'completed',
    'failed': 'failed',
    'busy': 'busy',
    'no-answer': 'no-answer',
    'canceled': 'canceled',
    'initiated': 'initiated',
  };
  return statusMap[status.toLowerCase()] || 'failed';
}

// =====================================================
// ACCOUNT BALANCE
// =====================================================

/**
 * Get Twilio account balance
 */
export async function getAccountBalance(): Promise<ProviderBalance> {
  const config = getTwilioConfig();

  if (!config) {
    return {
      provider: 'twilio',
      balance: 0,
      currency: 'USD',
      lastUpdated: new Date(),
    };
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Balance.json`;
    const auth = Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new SMSError(
        data.message || 'Failed to get balance',
        'BALANCE_ERROR',
        'twilio'
      );
    }

    return {
      provider: 'twilio',
      balance: parseFloat(data.balance || '0'),
      currency: data.currency || 'USD',
      lastUpdated: new Date(),
    };
  } catch (error) {
    console.error('[Twilio] Balance check error:', error);
    throw new SMSError(
      'Failed to check Twilio balance',
      'BALANCE_ERROR',
      'twilio',
      error
    );
  }
}

// =====================================================
// WEBHOOK HANDLERS
// =====================================================

/**
 * Handle Twilio SMS delivery status webhook
 */
export function handleDeliveryStatus(
  webhook: TwilioSMSWebhook
): {
  messageId: string;
  status: SMSStatus;
  to: string;
  errorCode?: string;
  errorMessage?: string;
  cost?: number;
} {
  return {
    messageId: webhook.MessageSid,
    status: mapTwilioStatus(webhook.MessageStatus),
    to: webhook.To,
    errorCode: webhook.ErrorCode,
    errorMessage: webhook.ErrorMessage,
    cost: webhook.Price ? parseFloat(webhook.Price) : undefined,
  };
}

/**
 * Handle Twilio voice call status webhook
 */
export function handleVoiceCallStatus(
  webhook: TwilioVoiceWebhook
): {
  callId: string;
  status: VoiceCallStatus;
  to: string;
  duration?: number;
  recordingUrl?: string;
  errorCode?: string;
  errorMessage?: string;
  cost?: number;
} {
  return {
    callId: webhook.CallSid,
    status: mapTwilioVoiceStatus(webhook.CallStatus),
    to: webhook.To,
    duration: webhook.CallDuration ? parseInt(webhook.CallDuration) : undefined,
    recordingUrl: webhook.RecordingUrl,
    errorCode: webhook.ErrorCode,
    errorMessage: webhook.ErrorMessage,
    cost: webhook.Price ? parseFloat(webhook.Price) : undefined,
  };
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Validate Twilio webhook signature
 */
export function validateTwilioWebhook(
  signature: string,
  url: string,
  params: Record<string, string>,
  authToken: string
): boolean {
  // In development, skip validation
  if (!authToken) return true;

  try {
    // Sort params alphabetically
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => key + params[key])
      .join('');
    
    const data = url + sortedParams;
    const expectedSignature = createHmac('sha1', authToken)
      .update(data)
      .digest('base64');
    
    return signature === expectedSignature;
  } catch (error) {
    console.error('[Twilio] Webhook validation error:', error);
    return false;
  }
}

// =====================================================
// ESTIMATE SMS COST
// =====================================================

/**
 * Estimate SMS cost for a given message
 */
export function estimateSMSCost(
  message: string,
  country: string
): { segments: number; cost: number } {
  // GSM 7-bit encoding allows 160 chars per segment
  // UCS-2 (Unicode) allows 70 chars per segment
  const hasUnicode = /[^\x00-\x7F]/.test(message);
  const charsPerSegment = hasUnicode ? 70 : 160;
  
  const segments = Math.ceil(message.length / charsPerSegment);
  
  // Cost per segment by country (in GNF)
  const costPerSegment: Record<string, number> = {
    'GN': 50,  // Guinea
    'SN': 45,  // Senegal
    'CI': 40,  // Ivory Coast
    'ML': 45,  // Mali
    'BF': 45,  // Burkina Faso
    'GH': 35,  // Ghana
    'NG': 30,  // Nigeria
  };
  
  const cost = segments * (costPerSegment[country] || 50);
  
  return { segments, cost };
}

export default {
  sendSMS,
  sendVoiceCall,
  sendVoiceCallWithAudio,
  getAccountBalance,
  handleDeliveryStatus,
  handleVoiceCallStatus,
  formatPhoneNumberForTwilio,
  detectCountryFromPhone,
  validateTwilioWebhook,
  estimateSMSCost,
};
