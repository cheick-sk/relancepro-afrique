// =====================================================
// RELANCEPRO AFRICA - Africa's Talking SMS & Voice Service
// Integration with Africa's Talking for SMS and Voice calls
// =====================================================

import {
  SMSMessageResult,
  VoiceCallResult,
  SMSStatus,
  VoiceCallStatus,
  ProviderBalance,
  AfricasTalkingSMSWebhook,
  AfricasTalkingVoiceWebhook,
  SMSError,
  VoiceCallError,
  BulkSMSResult,
} from './types';

// =====================================================
// AFRICA'S TALKING CONFIGURATION
// =====================================================

interface AfricasTalkingConfig {
  apiKey: string;
  username: string;
  senderId?: string;
}

function getAfricasTalkingConfig(): AfricasTalkingConfig | null {
  const apiKey = process.env.AFRICASTALKING_API_KEY;
  const username = process.env.AFRICASTALKING_USERNAME;
  const senderId = process.env.AFRICASTALKING_SENDER_ID;

  if (!apiKey || !username) {
    return null;
  }

  return { apiKey, username, senderId };
}

// API Base URLs
const SANDBOX_URL = 'https://api.sandbox.africastalking.com/version1';
const PRODUCTION_URL = 'https://api.africastalking.com/version1';

function getBaseUrl(): string {
  const config = getAfricasTalkingConfig();
  // Use sandbox for 'sandbox' username
  return config?.username === 'sandbox' ? SANDBOX_URL : PRODUCTION_URL;
}

// =====================================================
// PHONE NUMBER FORMATTING
// =====================================================

/**
 * Format phone number for Africa's Talking
 * Format: +224XXXXXXXXX or 224XXXXXXXXX
 */
export function formatPhoneNumberForAT(phone: string): string {
  // Remove spaces, dashes, parentheses
  let formatted = phone.replace(/[\s\-\(\)]/g, '');

  // If starts with +, keep as is
  if (formatted.startsWith('+')) {
    return formatted;
  }

  // If starts with 00, replace with +
  if (formatted.startsWith('00')) {
    return '+' + formatted.substring(2);
  }

  // If starts with 0, need to add country code (default to Guinea +224)
  if (formatted.startsWith('0')) {
    return '+224' + formatted.substring(1);
  }

  // Otherwise, add +
  return '+' + formatted;
}

/**
 * Format multiple phone numbers
 */
export function formatPhoneNumbersForAT(phones: string[]): string[] {
  return phones.map(formatPhoneNumberForAT);
}

// =====================================================
// SMS SERVICE
// =====================================================

/**
 * Send SMS via Africa's Talking
 */
export async function sendSMS(
  to: string,
  message: string,
  senderId?: string
): Promise<SMSMessageResult> {
  const config = getAfricasTalkingConfig();

  if (!config) {
    // Development mode - simulate sending
    console.log("[Africa's Talking] API not configured, simulating SMS send...");
    return {
      success: true,
      messageId: `simulated_at_${Date.now()}`,
      status: 'sent',
      provider: 'africastalking',
      to: formatPhoneNumberForAT(to),
      cost: 0,
      segments: Math.ceil(message.length / 160),
    };
  }

  const formattedTo = formatPhoneNumberForAT(to);
  const baseUrl = getBaseUrl();

  try {
    const formData = new URLSearchParams();
    formData.append('username', config.username);
    formData.append('to', formattedTo);
    formData.append('message', message);
    
    if (senderId || config.senderId) {
      formData.append('from', senderId || config.senderId || '');
    }

    const response = await fetch(`${baseUrl}/messaging`, {
      method: 'POST',
      headers: {
        'ApiKey': config.apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: formData.toString(),
    });

    const data = await response.json();

    if (!response.ok || data.SMSMessageData?.Recipients?.[0]?.status === 'error') {
      const errorMsg = data.SMSMessageData?.Recipients?.[0]?.status || 
                       data.errorMessage || 
                       `Africa's Talking error: ${response.status}`;
      console.error("[Africa's Talking] SMS error:", data);
      return {
        success: false,
        status: 'failed',
        provider: 'africastalking',
        to: formattedTo,
        error: errorMsg,
      };
    }

    const recipient = data.SMSMessageData?.Recipients?.[0];
    return {
      success: true,
      messageId: recipient?.messageId || `at_${Date.now()}`,
      status: mapATStatus(recipient?.status),
      provider: 'africastalking',
      to: formattedTo,
      cost: recipient?.cost ? parseFloat(recipient.cost) : 0,
      segments: 1,
    };
  } catch (error) {
    console.error("[Africa's Talking] SMS send error:", error);
    return {
      success: false,
      status: 'failed',
      provider: 'africastalking',
      to: formattedTo,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send Bulk SMS via Africa's Talking
 */
export async function sendBulkSMS(
  recipients: string[],
  message: string,
  senderId?: string
): Promise<BulkSMSResult> {
  const config = getAfricasTalkingConfig();

  if (!config) {
    console.log("[Africa's Talking] API not configured, simulating bulk SMS send...");
    return {
      success: true,
      totalSent: recipients.length,
      totalFailed: 0,
      results: recipients.map((to) => ({
        success: true,
        messageId: `simulated_at_${Date.now()}_${to}`,
        status: 'sent' as SMSStatus,
        provider: 'africastalking' as const,
        to: formatPhoneNumberForAT(to),
        cost: 0,
        segments: Math.ceil(message.length / 160),
      })),
      totalCost: 0,
    };
  }

  const formattedRecipients = formatPhoneNumbersForAT(recipients);
  const baseUrl = getBaseUrl();

  try {
    const formData = new URLSearchParams();
    formData.append('username', config.username);
    formData.append('to', formattedRecipients.join(','));
    formData.append('message', message);
    
    if (senderId || config.senderId) {
      formData.append('from', senderId || config.senderId || '');
    }

    const response = await fetch(`${baseUrl}/messaging`, {
      method: 'POST',
      headers: {
        'ApiKey': config.apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: formData.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[Africa's Talking] Bulk SMS error:", data);
      return {
        success: false,
        totalSent: 0,
        totalFailed: recipients.length,
        results: formattedRecipients.map((to) => ({
          success: false,
          status: 'failed' as SMSStatus,
          provider: 'africastalking' as const,
          to,
          error: data.errorMessage || 'Unknown error',
        })),
        totalCost: 0,
      };
    }

    const recipientData = data.SMSMessageData?.Recipients || [];
    let totalSent = 0;
    let totalFailed = 0;
    let totalCost = 0;

    const results: SMSMessageResult[] = recipientData.map((r: { messageId?: string; status: string; cost?: string; number: string }) => {
      const isSuccess = r.status === 'Success' || r.status === 'Sent';
      if (isSuccess) {
        totalSent++;
        if (r.cost) totalCost += parseFloat(r.cost);
      } else {
        totalFailed++;
      }

      return {
        success: isSuccess,
        messageId: r.messageId || `at_${Date.now()}`,
        status: mapATStatus(r.status),
        provider: 'africastalking' as const,
        to: r.number,
        cost: r.cost ? parseFloat(r.cost) : 0,
        segments: 1,
      };
    });

    return {
      success: totalFailed === 0,
      totalSent,
      totalFailed,
      results,
      totalCost,
    };
  } catch (error) {
    console.error("[Africa's Talking] Bulk SMS error:", error);
    return {
      success: false,
      totalSent: 0,
      totalFailed: recipients.length,
      results: formattedRecipients.map((to) => ({
        success: false,
        status: 'failed' as SMSStatus,
        provider: 'africastalking' as const,
        to,
        error: error instanceof Error ? error.message : 'Unknown error',
      })),
      totalCost: 0,
    };
  }
}

/**
 * Map Africa's Talking status to our status
 */
function mapATStatus(status: string): SMSStatus {
  const statusLower = (status || '').toLowerCase();
  const statusMap: Record<string, SMSStatus> = {
    'success': 'sent',
    'sent': 'sent',
    'submitted': 'queued',
    'queued': 'queued',
    'delivered': 'delivered',
    'failed': 'failed',
    'rejected': 'rejected',
    'insufficient balance': 'failed',
    'invalid number': 'failed',
    'error': 'failed',
  };
  return statusMap[statusLower] || 'pending';
}

// =====================================================
// VOICE SERVICE
// =====================================================

/**
 * Send Voice Call via Africa's Talking
 */
export async function sendVoiceCall(
  to: string,
  audioUrl: string,
  callbackUrl?: string
): Promise<VoiceCallResult> {
  const config = getAfricasTalkingConfig();

  if (!config) {
    console.log("[Africa's Talking] API not configured, simulating voice call...");
    return {
      success: true,
      callId: `simulated_at_call_${Date.now()}`,
      status: 'queued',
      provider: 'africastalking',
      to: formatPhoneNumberForAT(to),
    };
  }

  const formattedTo = formatPhoneNumberForAT(to);
  const baseUrl = getBaseUrl();

  try {
    const formData = new URLSearchParams();
    formData.append('username', config.username);
    formData.append('to', formattedTo);
    formData.append('audioUrl', audioUrl);
    
    if (callbackUrl) {
      formData.append('callbackUrl', callbackUrl);
    }

    const response = await fetch(`${baseUrl}/voice/call`, {
      method: 'POST',
      headers: {
        'ApiKey': config.apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: formData.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[Africa's Talking] Voice call error:", data);
      return {
        success: false,
        status: 'failed',
        provider: 'africastalking',
        to: formattedTo,
        error: data.errorMessage || `Africa's Talking error: ${response.status}`,
      };
    }

    const callEntry = data.entries?.[0];
    return {
      success: callEntry?.status !== 'Failed',
      callId: callEntry?.sessionId || `at_call_${Date.now()}`,
      status: mapATVoiceStatus(callEntry?.status),
      provider: 'africastalking',
      to: formattedTo,
    };
  } catch (error) {
    console.error("[Africa's Talking] Voice call error:", error);
    return {
      success: false,
      status: 'failed',
      provider: 'africastalking',
      to: formattedTo,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send Text-to-Speech Voice Call via Africa's Talking
 * Uses a generated audio URL or builds TwiML-like message
 */
export async function sendTextToSpeechCall(
  to: string,
  message: string,
  language: string = 'fr-FR',
  callbackUrl?: string
): Promise<VoiceCallResult> {
  const config = getAfricasTalkingConfig();

  if (!config) {
    console.log("[Africa's Talking] API not configured, simulating TTS call...");
    return {
      success: true,
      callId: `simulated_at_tts_${Date.now()}`,
      status: 'queued',
      provider: 'africastalking',
      to: formatPhoneNumberForAT(to),
    };
  }

  const formattedTo = formatPhoneNumberForAT(to);
  const baseUrl = getBaseUrl();

  try {
    // Africa's Talking voice call with say command
    const formData = new URLSearchParams();
    formData.append('username', config.username);
    formData.append('to', formattedTo);
    formData.append('message', message); // Text-to-speech message
    
    if (callbackUrl) {
      formData.append('callbackUrl', callbackUrl);
    }

    const response = await fetch(`${baseUrl}/voice/call`, {
      method: 'POST',
      headers: {
        'ApiKey': config.apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: formData.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[Africa's Talking] TTS call error:", data);
      return {
        success: false,
        status: 'failed',
        provider: 'africastalking',
        to: formattedTo,
        error: data.errorMessage || `Africa's Talking error: ${response.status}`,
      };
    }

    const callEntry = data.entries?.[0];
    return {
      success: callEntry?.status !== 'Failed',
      callId: callEntry?.sessionId || `at_tts_${Date.now()}`,
      status: mapATVoiceStatus(callEntry?.status),
      provider: 'africastalking',
      to: formattedTo,
    };
  } catch (error) {
    console.error("[Africa's Talking] TTS call error:", error);
    return {
      success: false,
      status: 'failed',
      provider: 'africastalking',
      to: formattedTo,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Map Africa's Talking voice status to our status
 */
function mapATVoiceStatus(status: string): VoiceCallStatus {
  const statusLower = (status || '').toLowerCase();
  const statusMap: Record<string, VoiceCallStatus> = {
    'queued': 'queued',
    'ringing': 'ringing',
    'inprogress': 'in-progress',
    'in-progress': 'in-progress',
    'completed': 'completed',
    'failed': 'failed',
    'busy': 'busy',
    'noanswer': 'no-answer',
    'no-answer': 'no-answer',
    'cancelled': 'canceled',
    'canceled': 'canceled',
  };
  return statusMap[statusLower] || 'failed';
}

// =====================================================
// ACCOUNT BALANCE
// =====================================================

/**
 * Get Africa's Talking account balance
 */
export async function getBalance(): Promise<ProviderBalance> {
  const config = getAfricasTalkingConfig();

  if (!config) {
    return {
      provider: 'africastalking',
      balance: 0,
      currency: 'USD',
      lastUpdated: new Date(),
    };
  }

  const baseUrl = getBaseUrl();

  try {
    const formData = new URLSearchParams();
    formData.append('username', config.username);

    const response = await fetch(`${baseUrl}/user`, {
      method: 'POST',
      headers: {
        'ApiKey': config.apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: formData.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new SMSError(
        data.errorMessage || 'Failed to get balance',
        'BALANCE_ERROR',
        'africastalking'
      );
    }

    const userData = data.userData;
    return {
      provider: 'africastalking',
      balance: parseFloat(userData?.balance || '0'),
      currency: userData?.currency || 'USD',
      lastUpdated: new Date(),
    };
  } catch (error) {
    console.error("[Africa's Talking] Balance check error:", error);
    throw new SMSError(
      "Failed to check Africa's Talking balance",
      'BALANCE_ERROR',
      'africastalking',
      error
    );
  }
}

// =====================================================
// WEBHOOK HANDLERS
// =====================================================

/**
 * Handle Africa's Talking SMS delivery report webhook
 */
export function handleDeliveryReport(
  webhook: AfricasTalkingSMSWebhook
): {
  messageId: string;
  status: SMSStatus;
  to: string;
  errorCode?: string;
  errorMessage?: string;
  cost?: number;
} {
  return {
    messageId: webhook.id,
    status: mapATStatus(webhook.status),
    to: webhook.phoneNumber,
    errorCode: webhook.statusCode !== 0 ? String(webhook.statusCode) : undefined,
    errorMessage: webhook.status !== 'Success' ? webhook.status : undefined,
    cost: webhook.cost ? parseFloat(webhook.cost) : undefined,
  };
}

/**
 * Handle Africa's Talking voice call status webhook
 */
export function handleVoiceCallStatus(
  webhook: AfricasTalkingVoiceWebhook
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
    callId: webhook.callSessionId,
    status: mapATVoiceStatus(webhook.status),
    to: webhook.callerNumber,
    duration: webhook.durationInSeconds,
    recordingUrl: webhook.recordingUrl,
    cost: webhook.amount,
  };
}

// =====================================================
// MESSAGING DATA (for analytics)
// =====================================================

/**
 * Get messaging data (sent messages stats)
 */
export async function getMessagingData(): Promise<{
  messagesSent: number;
  totalCost: number;
  currency: string;
}> {
  const config = getAfricasTalkingConfig();

  if (!config) {
    return {
      messagesSent: 0,
      totalCost: 0,
      currency: 'USD',
    };
  }

  const baseUrl = getBaseUrl();

  try {
    const formData = new URLSearchParams();
    formData.append('username', config.username);

    const response = await fetch(`${baseUrl}/messaging`, {
      method: 'GET',
      headers: {
        'ApiKey': config.apiKey,
        'Accept': 'application/json',
      },
    });

    const data = await response.json();

    return {
      messagesSent: data.SMSMessageData?.totalSent || 0,
      totalCost: data.SMSMessageData?.totalCost || 0,
      currency: data.SMSMessageData?.currency || 'USD',
    };
  } catch (error) {
    console.error("[Africa's Talking] Messaging data error:", error);
    return {
      messagesSent: 0,
      totalCost: 0,
      currency: 'USD',
    };
  }
}

// =====================================================
// ESTIMATE SMS COST
// =====================================================

/**
 * Estimate SMS cost for Africa's Talking
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
  sendBulkSMS,
  sendVoiceCall,
  sendTextToSpeechCall,
  getBalance,
  handleDeliveryReport,
  handleVoiceCallStatus,
  formatPhoneNumberForAT,
  formatPhoneNumbersForAT,
  getMessagingData,
  estimateSMSCost,
};
