// =====================================================
// RELANCEPRO AFRICA - Unified SMS & Voice Service
// Provider selection, fallback, and cost optimization
// =====================================================

import {
  SMSMessageResult,
  VoiceCallResult,
  SMSProvider,
  SMSStatus,
  VoiceCallStatus,
  VoiceLanguage,
  ProviderBalance,
  SendSMSParams,
  SendBulkSMSParams,
  BulkSMSResult,
  VoiceCallParams,
  AFRICAN_COUNTRIES,
  SMSError,
  VoiceCallError,
} from './types';
import * as twilioService from './twilio-service';
import * as africastalkingService from './africastalking-service';

// =====================================================
// PROVIDER SELECTION
// =====================================================

interface ProviderPreference {
  preferred: SMSProvider;
  fallback: SMSProvider | null;
}

/**
 * Get available providers based on environment configuration
 */
function getAvailableProviders(): SMSProvider[] {
  const providers: SMSProvider[] = [];
  
  // Check Twilio configuration
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
    providers.push('twilio');
  }
  
  // Check Africa's Talking configuration
  if (process.env.AFRICASTALKING_API_KEY && process.env.AFRICASTALKING_USERNAME) {
    providers.push('africastalking');
  }
  
  return providers;
}

/**
 * Auto-detect best provider for a phone number
 * Based on country and cost optimization
 */
export function selectBestProvider(phoneNumber: string): ProviderPreference {
  const availableProviders = getAvailableProviders();
  
  if (availableProviders.length === 0) {
    // No providers configured - will use simulation
    return { preferred: 'africastalking', fallback: null };
  }
  
  if (availableProviders.length === 1) {
    return { preferred: availableProviders[0], fallback: null };
  }
  
  // Detect country from phone number
  const country = twilioService.detectCountryFromPhone(phoneNumber);
  
  // Provider priority by country (based on cost and reliability)
  const providerPriority: Record<string, SMSProvider[]> = {
    'GN': ['africastalking', 'twilio'], // Guinea
    'SN': ['africastalking', 'twilio'], // Senegal
    'CI': ['africastalking', 'twilio'], // Ivory Coast
    'ML': ['africastalking', 'twilio'], // Mali
    'BF': ['africastalking', 'twilio'], // Burkina Faso
    'GH': ['africastalking', 'twilio'], // Ghana
    'NG': ['twilio', 'africastalking'], // Nigeria (Twilio has better rates)
    'UNKNOWN': ['africastalking', 'twilio'], // Default to Africa's Talking
  };
  
  const priority = providerPriority[country] || providerPriority['UNKNOWN'];
  
  // Select first available provider from priority list
  const preferred = priority.find(p => availableProviders.includes(p)) || availableProviders[0];
  const fallback = priority.find(p => p !== preferred && availableProviders.includes(p)) || null;
  
  return { preferred, fallback };
}

/**
 * Get provider configuration for a specific provider
 */
export function getProviderConfig(provider: SMSProvider): {
  configured: boolean;
  hasFallback: boolean;
} {
  const available = getAvailableProviders();
  return {
    configured: available.includes(provider),
    hasFallback: available.length > 1,
  };
}

// =====================================================
// SMS SERVICE
// =====================================================

/**
 * Send SMS with automatic provider selection and fallback
 */
export async function sendSMS(params: SendSMSParams): Promise<SMSMessageResult> {
  const { to, message, senderId } = params;
  
  // Validate phone number
  if (!to || !to.trim()) {
    return {
      success: false,
      status: 'failed',
      provider: 'africastalking',
      to: to,
      error: 'Invalid phone number',
    };
  }
  
  // Validate message
  if (!message || !message.trim()) {
    return {
      success: false,
      status: 'failed',
      provider: 'africastalking',
      to: to,
      error: 'Message cannot be empty',
    };
  }
  
  // Select best provider
  const { preferred, fallback } = selectBestProvider(to);
  
  // Try preferred provider
  let result: SMSMessageResult;
  
  if (preferred === 'twilio') {
    result = await twilioService.sendSMS(to, message);
  } else {
    result = await africastalkingService.sendSMS(to, message, senderId);
  }
  
  // If failed and fallback available, try fallback provider
  if (!result.success && fallback) {
    console.log(`[SMS] Primary provider ${preferred} failed, trying fallback ${fallback}`);
    
    if (fallback === 'twilio') {
      result = await twilioService.sendSMS(to, message);
    } else {
      result = await africastalkingService.sendSMS(to, message, senderId);
    }
  }
  
  return result;
}

/**
 * Send bulk SMS with automatic provider selection
 */
export async function sendBulkSMS(params: SendBulkSMSParams): Promise<BulkSMSResult> {
  const { recipients, message, senderId } = params;
  
  if (!recipients || recipients.length === 0) {
    return {
      success: false,
      totalSent: 0,
      totalFailed: 0,
      results: [],
      totalCost: 0,
    };
  }
  
  // Determine best provider based on first recipient (could be optimized further)
  const { preferred } = selectBestProvider(recipients[0]);
  
  // Use Africa's Talking for bulk SMS (better rates)
  if (preferred === 'africastalking' || getAvailableProviders().includes('africastalking')) {
    return await africastalkingService.sendBulkSMS(recipients, message, senderId);
  }
  
  // Fallback: Send individually via Twilio
  const results: SMSMessageResult[] = [];
  let totalSent = 0;
  let totalFailed = 0;
  let totalCost = 0;
  
  for (const recipient of recipients) {
    const result = await twilioService.sendSMS(recipient, message);
    results.push(result);
    
    if (result.success) {
      totalSent++;
      if (result.cost) totalCost += result.cost;
    } else {
      totalFailed++;
    }
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
 * Send voice call with automatic provider selection
 */
export async function sendVoiceCall(params: VoiceCallParams): Promise<VoiceCallResult> {
  const { to, message, audioUrl, language } = params;
  
  // Validate phone number
  if (!to || !to.trim()) {
    return {
      success: false,
      status: 'failed',
      provider: 'africastalking',
      to: to,
      error: 'Invalid phone number',
    };
  }
  
  // Validate either message or audioUrl
  if (!message && !audioUrl) {
    return {
      success: false,
      status: 'failed',
      provider: 'africastalking',
      to: to,
      error: 'Either message or audioUrl must be provided',
    };
  }
  
  // Select best provider
  const { preferred, fallback } = selectBestProvider(to);
  
  let result: VoiceCallResult;
  
  // Try preferred provider
  if (preferred === 'twilio') {
    if (audioUrl) {
      result = await twilioService.sendVoiceCallWithAudio(to, audioUrl, params.callbackUrl);
    } else {
      result = await twilioService.sendVoiceCall(to, message!, language || 'fr-FR', params.callbackUrl);
    }
  } else {
    if (audioUrl) {
      result = await africastalkingService.sendVoiceCall(to, audioUrl, params.callbackUrl);
    } else {
      result = await africastalkingService.sendTextToSpeechCall(to, message!, language, params.callbackUrl);
    }
  }
  
  // If failed and fallback available, try fallback provider
  if (!result.success && fallback) {
    console.log(`[Voice] Primary provider ${preferred} failed, trying fallback ${fallback}`);
    
    if (fallback === 'twilio') {
      if (audioUrl) {
        result = await twilioService.sendVoiceCallWithAudio(to, audioUrl, params.callbackUrl);
      } else {
        result = await twilioService.sendVoiceCall(to, message!, language || 'fr-FR', params.callbackUrl);
      }
    } else {
      if (audioUrl) {
        result = await africastalkingService.sendVoiceCall(to, audioUrl, params.callbackUrl);
      } else {
        result = await africastalkingService.sendTextToSpeechCall(to, message!, language, params.callbackUrl);
      }
    }
  }
  
  return result;
}

// =====================================================
// ACCOUNT BALANCE
// =====================================================

/**
 * Get balance for all configured providers
 */
export async function getAllBalances(): Promise<ProviderBalance[]> {
  const balances: ProviderBalance[] = [];
  const availableProviders = getAvailableProviders();
  
  for (const provider of availableProviders) {
    try {
      const balance = provider === 'twilio'
        ? await twilioService.getAccountBalance()
        : await africastalkingService.getBalance();
      balances.push(balance);
    } catch (error) {
      console.error(`[SMS] Failed to get ${provider} balance:`, error);
      balances.push({
        provider,
        balance: 0,
        currency: 'USD',
        lastUpdated: new Date(),
      });
    }
  }
  
  return balances;
}

/**
 * Get balance for a specific provider
 */
export async function getProviderBalance(provider: SMSProvider): Promise<ProviderBalance> {
  if (provider === 'twilio') {
    return await twilioService.getAccountBalance();
  } else {
    return await africastalkingService.getBalance();
  }
}

// =====================================================
// COST ESTIMATION
// =====================================================

/**
 * Estimate SMS cost for a message
 */
export function estimateSMSCost(
  message: string,
  phoneNumber: string
): { segments: number; cost: number; country: string; currency: string } {
  // Detect country
  const countryCode = twilioService.detectCountryFromPhone(phoneNumber);
  
  // Find country info
  const country = AFRICAN_COUNTRIES.find(c => c.code === countryCode);
  
  // Estimate segments
  const { segments, cost } = countryCode === 'UNKNOWN'
    ? twilioService.estimateSMSCost(message, 'GN') // Default to Guinea
    : twilioService.estimateSMSCost(message, countryCode);
  
  return {
    segments,
    cost,
    country: country?.name || 'Unknown',
    currency: 'GNF',
  };
}

/**
 * Estimate voice call cost
 */
export function estimateVoiceCost(
  phoneNumber: string,
  estimatedDurationMinutes: number = 1
): { cost: number; country: string; currency: string } {
  const countryCode = twilioService.detectCountryFromPhone(phoneNumber);
  const country = AFRICAN_COUNTRIES.find(c => c.code === countryCode);
  
  const costPerMinute = country?.voiceCost || 200;
  
  return {
    cost: costPerMinute * estimatedDurationMinutes,
    country: country?.name || 'Unknown',
    currency: 'GNF',
  };
}

// =====================================================
// PHONE NUMBER UTILITIES
// =====================================================

/**
 * Format phone number for display
 */
export function formatPhoneForDisplay(phone: string): string {
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  // Guinea: +224 XX XX XX XX
  if (cleaned.startsWith('+224') || cleaned.startsWith('224')) {
    const num = cleaned.replace('+224', '').replace('224', '');
    if (num.length >= 8) {
      return `+224 ${num.slice(0, 2)} ${num.slice(2, 4)} ${num.slice(4, 6)} ${num.slice(6, 8)}`;
    }
  }
  
  // Senegal: +221 XX XXX XX XX
  if (cleaned.startsWith('+221') || cleaned.startsWith('221')) {
    const num = cleaned.replace('+221', '').replace('221', '');
    if (num.length >= 9) {
      return `+221 ${num.slice(0, 2)} ${num.slice(2, 5)} ${num.slice(5, 7)} ${num.slice(7, 9)}`;
    }
  }
  
  // Ivory Coast: +225 XX XX XX XX XX
  if (cleaned.startsWith('+225') || cleaned.startsWith('225')) {
    const num = cleaned.replace('+225', '').replace('225', '');
    if (num.length >= 10) {
      return `+225 ${num.slice(0, 2)} ${num.slice(2, 4)} ${num.slice(4, 6)} ${num.slice(6, 8)} ${num.slice(8, 10)}`;
    }
  }
  
  // Default: return as-is with + prefix
  return cleaned.startsWith('+') ? cleaned : '+' + cleaned;
}

/**
 * Validate phone number for African countries
 */
export function validateAfricanPhone(phone: string): {
  valid: boolean;
  country?: string;
  error?: string;
} {
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  // Check for valid format
  if (!cleaned.startsWith('+') && !cleaned.startsWith('00') && !cleaned.startsWith('0')) {
    return { valid: false, error: 'Le numéro doit commencer par +, 00 ou 0' };
  }
  
  // Detect country
  const countryCode = twilioService.detectCountryFromPhone(phone);
  
  if (countryCode === 'UNKNOWN') {
    return { 
      valid: false, 
      error: 'Code pays non supporté. Pays supportés: Guinée, Sénégal, Côte d\'Ivoire, Mali, Burkina Faso, Ghana, Nigeria' 
    };
  }
  
  const country = AFRICAN_COUNTRIES.find(c => c.code === countryCode);
  
  // Validate length based on country
  const numberWithoutCode = cleaned.replace(/^\+?\d{3}/, '').replace(/^00\d{3}/, '').replace(/^0/, '');
  
  const expectedLengths: Record<string, number> = {
    'GN': 8,  // Guinea: 8 digits
    'SN': 9,  // Senegal: 9 digits
    'CI': 10, // Ivory Coast: 10 digits
    'ML': 8,  // Mali: 8 digits
    'BF': 8,  // Burkina Faso: 8 digits
    'GH': 9,  // Ghana: 9 digits
    'NG': 10, // Nigeria: 10 digits
  };
  
  const expectedLength = expectedLengths[countryCode] || 8;
  
  if (numberWithoutCode.length < expectedLength - 1 || numberWithoutCode.length > expectedLength + 1) {
    return { 
      valid: false, 
      error: `Numéro invalide pour ${country?.name}. Attendu: ${expectedLength} chiffres` 
    };
  }
  
  return { valid: true, country: country?.name };
}

// =====================================================
// MESSAGE TEMPLATES
// =====================================================

/**
 * Generate SMS reminder message
 */
export function generateSMSReminder(params: {
  clientName: string;
  amount: string;
  currency: string;
  dueDate: string;
  reference?: string;
  reminderNumber: 1 | 2 | 3;
  companyName?: string;
}): string {
  const { clientName, amount, currency, dueDate, reference, reminderNumber, companyName } = params;
  const company = companyName || 'Nous';
  
  const templates = {
    1: `Bonjour ${clientName},\n\nRappel: Facture ${reference || 'N/A'} de ${amount} ${currency} échue le ${dueDate}.\n\nMerci de régulariser votre situation.\n\n${company}`,
    
    2: `Bonjour ${clientName},\n\n⚠️ 2ème Rappel\nFacture ${reference || 'N/A'} de ${amount} ${currency} toujours impayée.\n\nMerci de régler rapidement.\n\n${company}`,
    
    3: `🚨 URGENT\n\n${clientName},\nFacture ${reference || 'N/A'} de ${amount} ${currency} impayée.\n\nSans règlement sous 7j, le dossier sera transmis au recouvrement.\n\n${company}`,
  };
  
  return templates[reminderNumber];
}

/**
 * Generate voice call script
 */
export function generateVoiceScript(params: {
  clientName: string;
  amount: string;
  currency: string;
  reference?: string;
  companyName?: string;
  language?: VoiceLanguage;
}): string {
  const { clientName, amount, currency, reference, companyName, language = 'fr-FR' } = params;
  const company = companyName || 'notre entreprise';
  
  if (language.startsWith('fr')) {
    return `Bonjour ${clientName}. Je vous appelle de la part de ${company}. 
    Nous vous contactons concernant votre facture numéro ${reference || 'en cours'}, 
    d'un montant de ${amount} ${currency}, qui reste impayée. 
    Nous vous prions de bien vouloir régulariser votre situation dans les meilleurs délais. 
    Pour toute question, veuillez nous contacter. Merci de votre compréhension.`;
  } else {
    return `Hello ${clientName}. This is a call from ${company}. 
    We are contacting you regarding your invoice number ${reference || 'pending'}, 
    with an amount of ${amount} ${currency}, which remains unpaid. 
    Please settle your account at your earliest convenience. 
    For any questions, please contact us. Thank you for your understanding.`;
  }
}

// Export all services
export default {
  sendSMS,
  sendBulkSMS,
  sendVoiceCall,
  getAllBalances,
  getProviderBalance,
  estimateSMSCost,
  estimateVoiceCost,
  selectBestProvider,
  getAvailableProviders,
  getProviderConfig,
  formatPhoneForDisplay,
  validateAfricanPhone,
  generateSMSReminder,
  generateVoiceScript,
};
