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
} from './types';
import { SMS_PRICING, detectCountryFromPhone, calculateSegments } from './config';

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

// =====================================================
// SMS SERVICE
// =====================================================

/**
 * Send SMS via Twilio
 * @param to - Recipient phone number
 * @param message - Message content
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
      segments: calculateSegments(message),
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
 * Send bulk SMS via Twilio
 * @param recipients - Array of phone numbers
 * @param message - Message content
 */
export async function sendBulkSMS(
  recipients: string[],
  message: string
): Promise<{
  success: boolean;
  totalSent: number;
  totalFailed: number;
  results: SMSMessageResult[];
  totalCost: number;
}> {
  const results: SMSMessageResult[] = [];
  let totalSent = 0;
  let totalFailed = 0;
  let totalCost = 0;

  for (const recipient of recipients) {
    const result = await sendSMS(recipient, message);
    results.push(result);

    if (result.success) {
      totalSent++;
      if (result.cost) totalCost += result.cost;
    } else {
      totalFailed++;
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return {
    success: totalFailed === 0,
    totalSent,
    totalFailed,
    results,
    totalCost,
  };
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
 * Make voice call with text-to-speech
 * @param to - Recipient phone number
 * @param message - Text-to-speech message
 * @param language - Voice language
 */
export async function makeVoiceCall(
  to: string,
  message: string,
  language: VoiceLanguage = 'fr-FR'
): Promise<VoiceCallResult> {
  const config = getTwilioConfig();

  if (!config) {
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
 * Get SMS delivery status
 * @param messageId - Twilio message SID
 */
export async function getSMSStatus(messageId: string): Promise<{
  status: SMSStatus;
  to?: string;
  cost?: number;
  errorCode?: string;
  errorMessage?: string;
}> {
  const config = getTwilioConfig();

  if (!config) {
    return { status: 'pending' };
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages/${messageId}.json`;
    const auth = Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { status: 'failed', errorMessage: data.message };
    }

    return {
      status: mapTwilioStatus(data.status),
      to: data.to,
      cost: parseFloat(data.price || '0'),
      errorCode: data.error_code,
      errorMessage: data.error_message,
    };
  } catch (error) {
    console.error('[Twilio] Get status error:', error);
    return { status: 'pending' };
  }
}

/**
 * Handle delivery webhook from Twilio
 * @param body - Webhook payload
 */
export function handleWebhook(body: TwilioSMSWebhook): {
  messageId: string;
  status: SMSStatus;
  to: string;
  errorCode?: string;
  errorMessage?: string;
  cost?: number;
} {
  return {
    messageId: body.MessageSid,
    status: mapTwilioStatus(body.MessageStatus),
    to: body.To,
    errorCode: body.ErrorCode,
    errorMessage: body.ErrorMessage,
    cost: body.Price ? parseFloat(body.Price) : undefined,
  };
}

/**
 * Handle voice call webhook from Twilio
 */
export function handleVoiceWebhook(body: TwilioVoiceWebhook): {
  callId: string;
  status: VoiceCallStatus;
  to: string;
  duration?: number;
  recordingUrl?: string;
  errorCode?: string;
  errorMessage?: string;
} {
  return {
    callId: body.CallSid,
    status: mapTwilioVoiceStatus(body.CallStatus),
    to: body.To,
    duration: body.CallDuration ? parseInt(body.CallDuration) : undefined,
    recordingUrl: body.RecordingUrl,
    errorCode: body.ErrorCode,
    errorMessage: body.ErrorMessage,
  };
}

// =====================================================
// ACCOUNT BALANCE
// =====================================================

/**
 * Get Twilio account balance
 */
export async function getBalance(): Promise<ProviderBalance> {
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
      throw new Error(data.message || 'Failed to get balance');
    }

    return {
      provider: 'twilio',
      balance: parseFloat(data.balance || '0'),
      currency: data.currency || 'USD',
      lastUpdated: new Date(),
    };
  } catch (error) {
    console.error('[Twilio] Balance check error:', error);
    return {
      provider: 'twilio',
      balance: 0,
      currency: 'USD',
      lastUpdated: new Date(),
    };
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

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
  if (!authToken) return true;

  try {
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

/**
 * Estimate SMS cost for Twilio
 */
export function estimateSMSCost(
  message: string,
  countryCode: string
): { segments: number; cost: number } {
  const segments = calculateSegments(message);
  const pricing = SMS_PRICING.find(c => c.code === countryCode);
  const costPerSegment = pricing?.twilioSmsCost || 150;
  
  return { segments, cost: segments * costPerSegment };
}

export default {
  sendSMS,
  sendBulkSMS,
  makeVoiceCall,
  getSMSStatus,
  handleWebhook,
  handleVoiceWebhook,
  getBalance,
  formatPhoneNumberForTwilio,
  validateTwilioWebhook,
  estimateSMSCost,
};
