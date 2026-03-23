// =====================================================
// RELANCEPRO AFRICA - Africa's Talking SMS & Voice Service
// Integration with Africa's Talking for SMS and Voice calls
// =====================================================

import {
  SMSMessageResult,
  VoiceCallResult,
  SMSStatus,
  VoiceCallStatus,
  VoiceLanguage,
  ProviderBalance,
  AfricasTalkingSMSWebhook,
  AfricasTalkingVoiceWebhook,
} from './types';
import { SMS_PRICING, calculateSegments, detectCountryFromPhone } from './config';

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
  return config?.username === 'sandbox' ? SANDBOX_URL : PRODUCTION_URL;
}

// =====================================================
// PHONE NUMBER FORMATTING
// =====================================================

/**
 * Format phone number for Africa's Talking
 */
export function formatPhoneNumberForAT(phone: string): string {
  let formatted = phone.replace(/[\s\-\(\)]/g, '');

  if (formatted.startsWith('+')) {
    return formatted;
  }

  if (formatted.startsWith('00')) {
    return '+' + formatted.substring(2);
  }

  if (formatted.startsWith('0')) {
    return '+224' + formatted.substring(1);
  }

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
 * @param to - Recipient phone number
 * @param message - Message content
 * @param senderId - Optional sender ID
 */
export async function sendSMS(
  to: string,
  message: string,
  senderId?: string
): Promise<SMSMessageResult> {
  const config = getAfricasTalkingConfig();

  if (!config) {
    console.log("[Africa's Talking] API not configured, simulating SMS send...");
    return {
      success: true,
      messageId: `simulated_at_${Date.now()}`,
      status: 'sent',
      provider: 'africastalking',
      to: formatPhoneNumberForAT(to),
      cost: 0,
      segments: calculateSegments(message),
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
      to: formatPhoneNumberForAT(to),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send bulk SMS via Africa's Talking
 * @param recipients - Array of phone numbers
 * @param message - Message content
 * @param senderId - Optional sender ID
 */
export async function sendBulkSMS(
  recipients: string[],
  message: string,
  senderId?: string
): Promise<{
  success: boolean;
  totalSent: number;
  totalFailed: number;
  results: SMSMessageResult[];
  totalCost: number;
}> {
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
        segments: calculateSegments(message),
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

// =====================================================
// VOICE SERVICE
// =====================================================

/**
 * Make voice call with text-to-speech via Africa's Talking
 * @param to - Recipient phone number
 * @param message - Text-to-speech message
 */
export async function makeVoiceCall(
  to: string,
  message: string
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
    formData.append('message', message);

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
      throw new Error(data.errorMessage || 'Failed to get balance');
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
    return {
      provider: 'africastalking',
      balance: 0,
      currency: 'USD',
      lastUpdated: new Date(),
    };
  }
}

// =====================================================
// AIRTIME INTEGRATION (for incentives)
// =====================================================

/**
 * Send airtime to a phone number
 * @param recipients - Array of {phoneNumber, amount} objects
 */
export async function sendAirtime(
  recipients: Array<{ phoneNumber: string; amount: string; currency?: string }>
): Promise<{
  success: boolean;
  results: Array<{ phoneNumber: string; status: string; amount: string; error?: string }>;
}> {
  const config = getAfricasTalkingConfig();

  if (!config) {
    console.log("[Africa's Talking] API not configured, simulating airtime send...");
    return {
      success: true,
      results: recipients.map(r => ({
        phoneNumber: r.phoneNumber,
        status: 'Success',
        amount: r.amount,
      })),
    };
  }

  const baseUrl = getBaseUrl();

  try {
    const formData = new URLSearchParams();
    formData.append('username', config.username);
    formData.append('recipients', JSON.stringify(
      recipients.map(r => ({
        phoneNumber: formatPhoneNumberForAT(r.phoneNumber),
        amount: r.amount,
        currencyCode: r.currency || 'GNF',
      }))
    ));

    const response = await fetch(`${baseUrl}/airtime/send`, {
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
      return {
        success: false,
        results: recipients.map(r => ({
          phoneNumber: r.phoneNumber,
          status: 'Failed',
          amount: r.amount,
          error: data.errorMessage || 'Unknown error',
        })),
      };
    }

    return {
      success: true,
      results: data.responses?.map((r: { phoneNumber: string; status: string; amount: string }) => ({
        phoneNumber: r.phoneNumber,
        status: r.status,
        amount: r.amount,
      })) || [],
    };
  } catch (error) {
    console.error("[Africa's Talking] Airtime send error:", error);
    return {
      success: false,
      results: recipients.map(r => ({
        phoneNumber: r.phoneNumber,
        status: 'Failed',
        amount: r.amount,
        error: error instanceof Error ? error.message : 'Unknown error',
      })),
    };
  }
}

// =====================================================
// WEBHOOK HANDLERS
// =====================================================

/**
 * Handle delivery webhook from Africa's Talking
 */
export function handleWebhook(webhook: AfricasTalkingSMSWebhook): {
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
 * Handle voice call webhook from Africa's Talking
 */
export function handleVoiceWebhook(webhook: AfricasTalkingVoiceWebhook): {
  callId: string;
  status: VoiceCallStatus;
  to: string;
  duration?: number;
  recordingUrl?: string;
} {
  return {
    callId: webhook.callSessionId,
    status: mapATVoiceStatus(webhook.status),
    to: webhook.callerNumber,
    duration: webhook.durationInSeconds,
    recordingUrl: webhook.recordingUrl,
  };
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

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

/**
 * Estimate SMS cost for Africa's Talking
 */
export function estimateSMSCost(
  message: string,
  countryCode: string
): { segments: number; cost: number } {
  const segments = calculateSegments(message);
  const pricing = SMS_PRICING.find(c => c.code === countryCode);
  const costPerSegment = pricing?.africastalkingSmsCost || 150;
  
  return { segments, cost: segments * costPerSegment };
}

export default {
  sendSMS,
  sendBulkSMS,
  makeVoiceCall,
  getBalance,
  sendAirtime,
  handleWebhook,
  handleVoiceWebhook,
  formatPhoneNumberForAT,
  formatPhoneNumbersForAT,
  estimateSMSCost,
};
